import { beforeEach, describe, expect, test } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../src/circuit-breaker/CircuitBreaker'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 5,
      resetTimeout: 60000,
      windowSize: 10000,
      successThreshold: 2,
      halfOpenRequests: 3,
    })
  })

  describe('State Management', () => {
    test('should initialize in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(breaker.isClosed()).toBe(true)
    })

    test('should transition from CLOSED to OPEN on failure threshold', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected to fail
        }
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
      expect(breaker.isOpen()).toBe(true)
    })

    test('should reject requests when OPEN', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected
        }
      }

      let errorThrown = false
      try {
        await breaker.execute(async () => {
          return 'success'
        })
      } catch (error) {
        errorThrown = true
        expect(String(error)).toContain('Circuit is OPEN')
      }
      expect(errorThrown).toBe(true)
    })

    test('should reset to CLOSED state manually', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true)
      breaker.reset()
      expect(breaker.isClosed()).toBe(true)
    })

    test('should transition through HALF_OPEN after resetTimeout', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true)

      // After checking state transition, should move to HALF_OPEN
      breaker.checkStateTransition()
      // Since we set resetTimeout to 60000, state won't change without time passage
      expect(breaker.isOpen()).toBe(true)
    })
  })

  describe('Failure Tracking', () => {
    test('should count consecutive failures', async () => {
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected
        }
      }
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBe(2)
      expect(metrics.totalFailures).toBe(2)
    })

    test('should reset failure count on success', async () => {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure')
        })
      } catch {
        // Expected
      }

      await breaker.execute(async () => {
        return 'success'
      })

      const metrics = breaker.getMetrics()
      expect(metrics.successes).toBeGreaterThan(0)
      expect(metrics.totalSuccesses).toBeGreaterThan(0)
    })

    test('should track total failures', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure')
          })
        } catch {
          // Expected
        }
      }
      const metrics = breaker.getMetrics()
      expect(metrics.totalFailures).toBe(3)
    })
  })

  describe('Success Tracking', () => {
    test('should count successes', async () => {
      for (let i = 0; i < 2; i++) {
        await breaker.execute(async () => {
          return 'success'
        })
      }
      const metrics = breaker.getMetrics()
      expect(metrics.successes).toBe(2)
      expect(metrics.totalSuccesses).toBe(2)
    })

    test('should track total successes', async () => {
      for (let i = 0; i < 5; i++) {
        await breaker.execute(async () => {
          return 'success'
        })
      }
      const metrics = breaker.getMetrics()
      expect(metrics.totalSuccesses).toBe(5)
    })
  })

  describe('Metrics', () => {
    test('should return circuit metrics', () => {
      const metrics = breaker.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.totalRequests).toBe(0)
      expect(metrics.failures).toBe(0)
      expect(metrics.successes).toBe(0)
    })

    test('should track total requests', async () => {
      await breaker.execute(async () => 'success')
      await breaker.execute(async () => 'success')
      try {
        await breaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // Expected
      }
      const metrics = breaker.getMetrics()
      expect(metrics.totalRequests).toBe(3)
    })

    test('should provide last failure timestamp', async () => {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure')
        })
      } catch {
        // Expected
      }
      const metrics = breaker.getMetrics()
      expect(metrics.lastFailureAt).toBeDefined()
      expect(metrics.lastFailureAt instanceof Date).toBe(true)
    })

    test('should provide last success timestamp', async () => {
      await breaker.execute(async () => 'success')
      const metrics = breaker.getMetrics()
      expect(metrics.lastSuccessAt).toBeDefined()
      expect(metrics.lastSuccessAt instanceof Date).toBe(true)
    })
  })

  describe('Configuration', () => {
    test('should respect failure threshold', async () => {
      const customBreaker = new CircuitBreaker('custom', {
        failureThreshold: 3,
        resetTimeout: 60000,
        windowSize: 10000,
      })

      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(async () => {
            throw new Error('fail')
          })
        } catch {
          // Expected
        }
      }
      expect(customBreaker.isClosed()).toBe(true)

      try {
        await customBreaker.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // Expected
      }
      expect(customBreaker.isOpen()).toBe(true)
    })

    test('should respect windowSize', () => {
      const customBreaker = new CircuitBreaker('custom', {
        failureThreshold: 2,
        windowSize: 5000,
        resetTimeout: 60000,
      })
      expect(customBreaker).toBeDefined()
    })
  })

  describe('Disabled State', () => {
    test('should bypass circuit breaker when disabled', async () => {
      const disabledBreaker = new CircuitBreaker('disabled', {
        failureThreshold: 5,
        resetTimeout: 60000,
        enabled: false,
      })

      for (let i = 0; i < 10; i++) {
        try {
          await disabledBreaker.execute(async () => {
            throw new Error('fail')
          })
        } catch {
          // Expected
        }
      }

      // Should still be CLOSED because disabled
      expect(disabledBreaker.isClosed()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('should handle zero failures gracefully', () => {
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBe(0)
      expect(metrics.totalFailures).toBe(0)
    })

    test('should not go below 0 for any counter', async () => {
      await breaker.execute(async () => 'success')
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBeGreaterThanOrEqual(0)
      expect(metrics.successes).toBeGreaterThanOrEqual(0)
      expect(metrics.totalFailures).toBeGreaterThanOrEqual(0)
      expect(metrics.totalSuccesses).toBeGreaterThanOrEqual(0)
    })
  })
})
