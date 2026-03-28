import { describe, it, expect } from 'bun:test'
import { InfrastructureException } from '@gravito/core'
import { GravitoException } from '@gravito/core'
import { RetryExhaustedException } from '../../src/exceptions/RetryExhaustedException'
import { CircuitOpenException } from '../../src/exceptions/CircuitOpenException'
import { withRetry } from '../../src/retry/withRetry'
import type { RetryOptions } from '../../src/retry/RetryOptions'

// Concrete test exception class extending InfrastructureException
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

describe('RetryExhaustedException', () => {
  it('is instanceof RetryExhaustedException', () => {
    const err = new RetryExhaustedException()
    expect(err).toBeInstanceOf(RetryExhaustedException)
  })

  it('is instanceof InfrastructureException', () => {
    const err = new RetryExhaustedException()
    expect(err).toBeInstanceOf(InfrastructureException)
  })

  it('is instanceof GravitoException', () => {
    const err = new RetryExhaustedException()
    expect(err).toBeInstanceOf(GravitoException)
  })

  it('is instanceof Error', () => {
    const err = new RetryExhaustedException()
    expect(err).toBeInstanceOf(Error)
  })

  it('has code resilience.retry_exhausted', () => {
    const err = new RetryExhaustedException()
    expect(err.code).toBe('resilience.retry_exhausted')
  })

  it('has status 503', () => {
    const err = new RetryExhaustedException()
    expect(err.status).toBe(503)
  })

  it('has retryable false', () => {
    const err = new RetryExhaustedException()
    expect(err.retryable).toBe(false)
  })

  it('preserves .cause', () => {
    const cause = new Error('original cause')
    const err = new RetryExhaustedException({ cause })
    expect(err.cause).toBe(cause)
  })

  it('uses default message when none provided', () => {
    const err = new RetryExhaustedException()
    expect(err.message).toBe('Operation failed after all retry attempts')
  })

  it('uses custom message when provided', () => {
    const err = new RetryExhaustedException({ message: 'Custom message' })
    expect(err.message).toBe('Custom message')
  })
})

describe('CircuitOpenException', () => {
  it('is instanceof CircuitOpenException', () => {
    const err = new CircuitOpenException()
    expect(err).toBeInstanceOf(CircuitOpenException)
  })

  it('is instanceof InfrastructureException', () => {
    const err = new CircuitOpenException()
    expect(err).toBeInstanceOf(InfrastructureException)
  })

  it('is instanceof GravitoException', () => {
    const err = new CircuitOpenException()
    expect(err).toBeInstanceOf(GravitoException)
  })

  it('has code resilience.circuit_open', () => {
    const err = new CircuitOpenException()
    expect(err.code).toBe('resilience.circuit_open')
  })

  it('has status 503', () => {
    const err = new CircuitOpenException()
    expect(err.status).toBe(503)
  })

  it('has retryable false', () => {
    const err = new CircuitOpenException()
    expect(err.retryable).toBe(false)
  })

  it('includes breakerName in message when provided', () => {
    const err = new CircuitOpenException({ breakerName: 'payment-service' })
    expect(err.message).toContain('payment-service')
    expect(err.message).toContain('OPEN')
  })

  it('uses default message when no breakerName provided', () => {
    const err = new CircuitOpenException()
    expect(err.message).toBe('Circuit breaker is OPEN')
  })
})

describe('withRetry', () => {
  const fastOptions: RetryOptions = {
    idempotent: true,
    maxAttempts: 3,
    baseDelayMs: 1,
    maxDelayMs: 10,
  }

  it('succeeds on first attempt if fn succeeds', async () => {
    const result = await withRetry(async () => 'success', fastOptions)
    expect(result).toBe('success')
  })

  it('retries up to maxAttempts when fn throws retryable InfrastructureException', async () => {
    let callCount = 0
    await expect(
      withRetry(async () => {
        callCount++
        throw new TestRetryableError()
      }, fastOptions),
    ).rejects.toBeInstanceOf(RetryExhaustedException)
    expect(callCount).toBe(3)
  })

  it('throws RetryExhaustedException after maxAttempts exhausted', async () => {
    const originalError = new TestRetryableError('original')
    let thrown: unknown
    try {
      await withRetry(async () => {
        throw originalError
      }, fastOptions)
    } catch (err) {
      thrown = err
    }
    expect(thrown).toBeInstanceOf(RetryExhaustedException)
  })

  it('preserves last error as .cause on RetryExhaustedException', async () => {
    const originalError = new TestRetryableError('original')
    let thrown: unknown
    try {
      await withRetry(async () => {
        throw originalError
      }, fastOptions)
    } catch (err) {
      thrown = err
    }
    expect((thrown as RetryExhaustedException).cause).toBe(originalError)
  })

  it('does NOT retry when error has retryable === false', async () => {
    let callCount = 0
    await expect(
      withRetry(async () => {
        callCount++
        throw new TestNonRetryableError()
      }, fastOptions),
    ).rejects.toBeInstanceOf(RetryExhaustedException)
    // Should only be called once (no retries for non-retryable)
    expect(callCount).toBe(1)
  })

  it('does NOT retry non-InfrastructureException errors unless retryOn matches', async () => {
    let callCount = 0
    await expect(
      withRetry(async () => {
        callCount++
        throw new Error('generic error')
      }, fastOptions),
    ).rejects.toBeInstanceOf(RetryExhaustedException)
    expect(callCount).toBe(1)
  })

  it('retries when custom retryOn predicate returns true', async () => {
    let callCount = 0
    const optionsWithRetryOn: RetryOptions = {
      ...fastOptions,
      retryOn: (err) => err instanceof Error && err.message === 'transient',
    }
    await expect(
      withRetry(async () => {
        callCount++
        throw new Error('transient')
      }, optionsWithRetryOn),
    ).rejects.toBeInstanceOf(RetryExhaustedException)
    expect(callCount).toBe(3)
  })

  it('does NOT retry when custom retryOn predicate returns false', async () => {
    let callCount = 0
    const optionsWithRetryOn: RetryOptions = {
      ...fastOptions,
      retryOn: () => false,
    }
    await expect(
      withRetry(async () => {
        callCount++
        throw new Error('non-transient')
      }, optionsWithRetryOn),
    ).rejects.toBeInstanceOf(RetryExhaustedException)
    expect(callCount).toBe(1)
  })

  it('throws Error when idempotent is not true (runtime guard)', async () => {
    await expect(
      withRetry(
        async () => 'result',
        { idempotent: true } as RetryOptions,
      ),
    ).resolves.toBe('result')
  })

  it('throws runtime error when options missing idempotent guard (cast)', async () => {
    // Cast to bypass TypeScript — simulates runtime call without idempotent: true
    const badOptions = { maxAttempts: 3 } as unknown as RetryOptions
    await expect(
      withRetry(async () => 'result', badOptions),
    ).rejects.toThrow('idempotent')
  })

  it('succeeds after transient failures then success', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      if (callCount < 3) {
        throw new TestRetryableError()
      }
      return 'finally succeeded'
    }, fastOptions)
    expect(result).toBe('finally succeeded')
    expect(callCount).toBe(3)
  })
})
