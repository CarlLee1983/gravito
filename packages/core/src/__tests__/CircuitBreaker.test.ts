import { beforeEach, describe, expect, it } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../events/CircuitBreaker'
import { HookManager } from '../HookManager'

describe('Circuit Breaker', () => {
  describe('Core Functionality', () => {
    it('should execute operation successfully in CLOSED state', async () => {
      const breaker = new CircuitBreaker()
      const result = await breaker.execute(async () => 'success')

      expect(result).toBe('success')
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(breaker.getFailureCount()).toBe(0)
    })

    it('should increment failure count on failure in CLOSED state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 })

      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // ignore
      }

      expect(breaker.getFailureCount()).toBe(1)
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should open circuit after threshold reached', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 })

      // 1st failure
      try {
        await breaker.execute(async () => {
          throw new Error('fail 1')
        })
      } catch {}
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)

      // 2nd failure
      try {
        await breaker.execute(async () => {
          throw new Error('fail 2')
        })
      } catch {}
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should reject execution immediately when OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 })

      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {}
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // Should throw circuit open error immediately
      let error: Error | undefined
      try {
        await breaker.execute(async () => 'success')
      } catch (e) {
        error = e as Error
      }

      expect(error).toBeDefined()
      expect(error?.message).toContain('Circuit is OPEN')
    })

    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 100 })

      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {}
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Next execution should be allowed (transition to HALF_OPEN)
      // We simulate a successful call here
      const result = await breaker.execute(async () => 'success')

      expect(result).toBe('success')
      // Since halfOpenRequests defaults to 3, one success keeps it in HALF_OPEN (wait, no)
      // Logic: if not enough requests yet, stays in HALF_OPEN?
      // Let's check logic: if (this.successCount >= this.config.halfOpenRequests)
      // Default halfOpenRequests is 3. So 1 success means still HALF_OPEN?
      // Wait, transitionTo HALF_OPEN happens lazily inside execute().

      // Let's check state after 1 success.
      // 1 < 3, so state should be HALF_OPEN?
      // Wait, transition check is: if (last attempt time > reset timeout) -> HALF_OPEN.
      // Then execute operation. If success -> onSuccess().
      // onSuccess: if HALF_OPEN -> successCount++. if >= limit -> CLOSED.

      // So if halfOpenRequests is default 3, it should remain HALF_OPEN.
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })

    it('should close circuit after enough successes in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenRequests: 2,
      })

      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 60))

      // 1st success
      await breaker.execute(async () => 'success')
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      // 2nd success
      await breaker.execute(async () => 'success')
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should reopen circuit immediately on specific failure in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 50 })

      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 60))

      // Should execute (HALF_OPEN) but fail
      try {
        await breaker.execute(async () => {
          throw new Error('fail again')
        })
      } catch {}

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })
  })

  describe('HookManager Integration', () => {
    let hookManager: HookManager

    beforeEach(() => {
      hookManager = new HookManager()
    })

    it('should protect listener with circuit breaker', async () => {
      let callCount = 0

      hookManager.addAction(
        'test:event',
        async () => {
          callCount++
          throw new Error('Listener failed')
        },
        {
          circuitBreaker: {
            failureThreshold: 2,
            resetTimeout: 1000,
          },
        }
      )

      // 1st call - fail
      await hookManager.doAction('test:event', {})

      // 2nd call - fail -> OPEN
      await hookManager.doAction('test:event', {})

      expect(callCount).toBe(2)

      // 3rd call - should be blocked by circuit breaker
      await hookManager.doAction('test:event', {})

      // Call count should not increase
      expect(callCount).toBe(2)
    })

    it('should affect only failing listener', async () => {
      let failCount = 0
      let successCount = 0

      // Failing listener
      hookManager.addAction(
        'test:event',
        async () => {
          failCount++
          throw new Error('Fail')
        },
        {
          circuitBreaker: { failureThreshold: 1, resetTimeout: 1000 },
        }
      )

      // Successful listener
      hookManager.addAction('test:event', async () => {
        successCount++
      })

      // 1st run
      await hookManager.doAction('test:event', {})
      expect(failCount).toBe(1)
      expect(successCount).toBe(1)

      // 2nd run - failing listener blocked, successful one runs
      await hookManager.doAction('test:event', {})

      expect(failCount).toBe(1) // Blocked
      expect(successCount).toBe(2) // Ran
    })
  })
})
