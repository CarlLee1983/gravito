import { describe, it, expect, beforeEach } from 'bun:test'
import { InfrastructureException } from '@gravito/core'
import { CircuitOpenException } from '../../src/exceptions/CircuitOpenException'
import { RetryExhaustedException } from '../../src/exceptions/RetryExhaustedException'
import { withResilience, _resetCBRegistry } from '../../src/resilience/withResilience'
import type { ResiliencePolicy } from '../../src/resilience/ResiliencePolicy'

// Concrete test exception classes
class TestRetryableError extends InfrastructureException {
  constructor(message = 'test retryable error') {
    super(503, 'test.retryable', { message, retryable: true })
    this.name = 'TestRetryableError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

class TestNonRetryableError extends InfrastructureException {
  constructor(message = 'test non-retryable error') {
    super(503, 'test.non_retryable', { message, retryable: false })
    this.name = 'TestNonRetryableError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// Reset registry before each test to avoid CB state bleed
beforeEach(() => {
  _resetCBRegistry()
})

describe('withResilience — empty policy', () => {
  it('calls fn directly and returns result when policy is empty', async () => {
    const result = await withResilience(() => Promise.resolve(42), {})
    expect(result).toBe(42)
  })

  it('propagates errors when policy is empty', async () => {
    const err = new TestNonRetryableError()
    await expect(withResilience(() => Promise.reject(err), {})).rejects.toThrow(
      TestNonRetryableError,
    )
  })
})

describe('withResilience — retry only', () => {
  it('retries on InfrastructureException with retryable=true', async () => {
    let callCount = 0
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 1 },
    }

    await expect(
      withResilience(async () => {
        callCount++
        throw new TestRetryableError()
      }, policy),
    ).rejects.toBeInstanceOf(RetryExhaustedException)

    expect(callCount).toBe(3)
  })

  it('does not retry on non-retryable InfrastructureException', async () => {
    let callCount = 0
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 1 },
    }

    await expect(
      withResilience(async () => {
        callCount++
        throw new TestNonRetryableError()
      }, policy),
    ).rejects.toBeInstanceOf(RetryExhaustedException)

    // Non-retryable = only 1 call, then RetryExhaustedException
    expect(callCount).toBe(1)
  })

  it('succeeds without retry when fn resolves on first try', async () => {
    let callCount = 0
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 1 },
    }

    const result = await withResilience(async () => {
      callCount++
      return 'success'
    }, policy)

    expect(result).toBe('success')
    expect(callCount).toBe(1)
  })

  it('succeeds when fn fails initially then recovers', async () => {
    let callCount = 0
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 1 },
    }

    const result = await withResilience(async () => {
      callCount++
      if (callCount < 3) throw new TestRetryableError()
      return 'recovered'
    }, policy)

    expect(result).toBe('recovered')
    expect(callCount).toBe(3)
  })
})

describe('withResilience — circuit breaker only', () => {
  it('opens circuit after failure threshold and throws CircuitOpenException', async () => {
    const policy: ResiliencePolicy = {
      circuitBreaker: {
        name: 'test-cb-open',
        failureThreshold: 2,
        resetTimeout: 10_000,
      },
    }

    // Trigger failures to open the circuit
    for (let i = 0; i < 2; i++) {
      await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})
    }

    // Circuit should now be OPEN — next call should throw CircuitOpenException immediately
    await expect(withResilience(() => Promise.resolve('ok'), policy)).rejects.toBeInstanceOf(
      CircuitOpenException,
    )
  })

  it('throws CircuitOpenException immediately when CB is open (no fn execution)', async () => {
    const policy: ResiliencePolicy = {
      circuitBreaker: {
        name: 'test-cb-no-exec',
        failureThreshold: 2,
        resetTimeout: 60_000,
      },
    }

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})
    }

    let fnCalled = false
    await expect(
      withResilience(async () => {
        fnCalled = true
        return 'should not run'
      }, policy),
    ).rejects.toBeInstanceOf(CircuitOpenException)

    expect(fnCalled).toBe(false)
  })
})

describe('withResilience — retry + circuit breaker (D-08 ordering)', () => {
  it('applies retry-inside-CB ordering: retries happen within CB protection', async () => {
    let callCount = 0
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 2, baseDelayMs: 1 },
      circuitBreaker: {
        name: 'test-cb-retry-combo',
        failureThreshold: 10, // high threshold so CB stays closed
        resetTimeout: 60_000,
      },
    }

    await expect(
      withResilience(async () => {
        callCount++
        throw new TestRetryableError()
      }, policy),
    ).rejects.toBeInstanceOf(RetryExhaustedException)

    // retry maxAttempts=2 means 2 total calls (initial + 1 retry)
    expect(callCount).toBe(2)
  })

  it('throws CircuitOpenException immediately when CB is open, even with retry policy', async () => {
    const policy: ResiliencePolicy = {
      retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 1 },
      circuitBreaker: {
        name: 'test-cb-open-with-retry',
        failureThreshold: 2,
        resetTimeout: 60_000,
      },
    }

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})
    }

    let fnCallCount = 0
    await expect(
      withResilience(async () => {
        fnCallCount++
        return 'ok'
      }, policy),
    ).rejects.toBeInstanceOf(CircuitOpenException)

    // CB is open — fn should NOT be called at all
    expect(fnCallCount).toBe(0)
  })
})

describe('withResilience — timeout', () => {
  it('throws when operation exceeds timeout', async () => {
    const policy: ResiliencePolicy = { timeout: 50 }

    await expect(
      withResilience(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return 'too slow'
      }, policy),
    ).rejects.toThrow()
  })

  it('succeeds when operation completes before timeout', async () => {
    const policy: ResiliencePolicy = { timeout: 500 }

    const result = await withResilience(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return 'fast enough'
    }, policy)

    expect(result).toBe('fast enough')
  })
})

describe('withResilience — timeout + retry + CB (all three, D-08)', () => {
  it('applies all three in correct order without errors on happy path', async () => {
    const policy: ResiliencePolicy = {
      timeout: 500,
      circuitBreaker: {
        name: 'test-all-three',
        failureThreshold: 10,
        resetTimeout: 60_000,
      },
      retry: { idempotent: true, maxAttempts: 2, baseDelayMs: 1 },
    }

    const result = await withResilience(() => Promise.resolve('all good'), policy)
    expect(result).toBe('all good')
  })
})

describe('withResilience — named CB registry', () => {
  it('shares state across multiple withResilience calls with same CB name', async () => {
    const policy: ResiliencePolicy = {
      circuitBreaker: {
        name: 'shared-breaker',
        failureThreshold: 2,
        resetTimeout: 60_000,
      },
    }

    // First call: fail once (opens at failureThreshold=2)
    await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})

    // Second call using the same named breaker
    const policy2: ResiliencePolicy = {
      circuitBreaker: 'shared-breaker',
    }

    // Fail once more via policy2 (same registry entry) — should open circuit
    await withResilience(() => Promise.reject(new Error('fail')), policy2).catch(() => {})

    // Now the circuit should be open across both policies
    await expect(withResilience(() => Promise.resolve('ok'), policy2)).rejects.toBeInstanceOf(
      CircuitOpenException,
    )
  })

  it('supports string shorthand for named CB', async () => {
    const policy: ResiliencePolicy = {
      circuitBreaker: {
        name: 'string-cb-test',
        failureThreshold: 2,
        resetTimeout: 60_000,
      },
    }

    // Open the circuit via options form
    for (let i = 0; i < 2; i++) {
      await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})
    }

    // Use string shorthand — should use the same breaker
    const policyByName: ResiliencePolicy = { circuitBreaker: 'string-cb-test' }
    await expect(withResilience(() => Promise.resolve('ok'), policyByName)).rejects.toBeInstanceOf(
      CircuitOpenException,
    )
  })
})

describe('withResilience — NODE_ENV=test (D-11)', () => {
  it('throws CircuitOpenException rather than returning fallback when CB is open', async () => {
    // Per D-11: withResilience always throws, never returns fallback values.
    // The fallback path belongs to Phase 20 OrbitDegradationManager.
    const policy: ResiliencePolicy = {
      circuitBreaker: {
        name: 'test-d11-breaker',
        failureThreshold: 2,
        resetTimeout: 60_000,
      },
    }

    for (let i = 0; i < 2; i++) {
      await withResilience(() => Promise.reject(new Error('fail')), policy).catch(() => {})
    }

    // Must throw, never return a value
    let threw = false
    try {
      await withResilience(() => Promise.resolve('fallback'), policy)
    } catch (e) {
      threw = true
      expect(e).toBeInstanceOf(CircuitOpenException)
    }
    expect(threw).toBe(true)
  })
})
