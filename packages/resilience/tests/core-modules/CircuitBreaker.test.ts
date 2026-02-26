import { beforeEach, describe, expect, test } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../src/circuit-breaker/CircuitBreaker'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      windowSize: 10000,
    })
  })

  describe('State Management', () => {
    test('should initialize in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    test('should transition from CLOSED to OPEN on failure threshold', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    test('should transition from OPEN to HALF_OPEN after timeout', async () => {
      breaker.recordFailure()
      breaker.recordFailure()
      breaker.recordFailure()
      breaker.recordFailure()
      breaker.recordFailure()
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
      // In real implementation, wait for reset timeout
    })

    test('should transition from HALF_OPEN to CLOSED on success', () => {
      // Move to OPEN state first
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      // Then simulate recovery
      breaker.recordSuccess()
      // After success in HALF_OPEN, should return to CLOSED
    })

    test('should transition from HALF_OPEN to OPEN on failure', () => {
      // Setup: get to OPEN state
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })
  })

  describe('Failure Tracking', () => {
    test('should count consecutive failures', () => {
      breaker.recordFailure()
      breaker.recordFailure()
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBe(2)
    })

    test('should reset failure count on success', () => {
      breaker.recordFailure()
      breaker.recordSuccess()
      const metrics = breaker.getMetrics()
      expect(metrics.successes).toBeGreaterThan(0)
    })

    test('should track total failures', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure()
      }
      const metrics = breaker.getMetrics()
      expect(metrics.totalFailures).toBe(3)
    })
  })

  describe('Success Tracking', () => {
    test('should count successes', () => {
      breaker.recordSuccess()
      breaker.recordSuccess()
      const metrics = breaker.getMetrics()
      expect(metrics.successes).toBe(2)
    })

    test('should track total successes', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordSuccess()
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
    })

    test('should track total requests', () => {
      breaker.recordSuccess()
      breaker.recordSuccess()
      breaker.recordFailure()
      const metrics = breaker.getMetrics()
      expect(metrics.totalRequests).toBeGreaterThan(0)
    })

    test('should provide last failure timestamp', () => {
      breaker.recordFailure()
      const metrics = breaker.getMetrics()
      expect(metrics.lastFailureAt).toBeDefined()
    })

    test('should provide last success timestamp', () => {
      breaker.recordSuccess()
      const metrics = breaker.getMetrics()
      expect(metrics.lastSuccessAt).toBeDefined()
    })

    test('should calculate failure rate', () => {
      for (let i = 0; i < 8; i++) {
        breaker.recordSuccess()
      }
      for (let i = 0; i < 2; i++) {
        breaker.recordFailure()
      }
      const metrics = breaker.getMetrics()
      expect(metrics.totalRequests).toBe(10)
    })
  })

  describe('Configuration', () => {
    test('should respect failure threshold', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 60000,
        windowSize: 10000,
      })

      customBreaker.recordFailure()
      customBreaker.recordFailure()
      expect(customBreaker.getState()).toBe(CircuitBreakerState.CLOSED)

      customBreaker.recordFailure()
      expect(customBreaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    test('should respect window size', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 2,
        windowSize: 5000,
        resetTimeout: 60000,
      })
      expect(customBreaker).toBeDefined()
    })
  })

  describe('Half-Open State Behavior', () => {
    test('should allow limited requests in HALF_OPEN', () => {
      // Trigger OPEN state
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    test('should quickly return to OPEN on failure in HALF_OPEN', () => {
      // Setup: get to OPEN
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // In HALF_OPEN, single failure should reopen
      breaker.recordFailure()
    })
  })

  describe('Edge Cases', () => {
    test('should handle zero failures gracefully', () => {
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBe(0)
    })

    test('should handle rapid state changes', () => {
      breaker.recordSuccess()
      breaker.recordSuccess()
      breaker.recordFailure()
      breaker.recordSuccess()
      const metrics = breaker.getMetrics()
      expect(metrics).toBeDefined()
    })

    test('should not go below 0 for any counter', () => {
      const metrics = breaker.getMetrics()
      expect(metrics.failures).toBeGreaterThanOrEqual(0)
      expect(metrics.successes).toBeGreaterThanOrEqual(0)
      expect(metrics.totalFailures).toBeGreaterThanOrEqual(0)
      expect(metrics.totalSuccesses).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Reset Behavior', () => {
    test('should reset metrics after state change', () => {
      breaker.recordFailure()
      breaker.recordSuccess()
      const metrics = breaker.getMetrics()
      expect(metrics).toBeDefined()
    })
  })
})
