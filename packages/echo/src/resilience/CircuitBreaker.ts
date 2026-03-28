/**
 * Circuit Breaker — re-exported from @gravito/resilience (canonical implementation).
 * Per D-01: echo's duplicate CB is replaced with re-exports from @gravito/resilience.
 * @module @gravito/echo/resilience
 */
export {
  CircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerOptions,
  type CircuitBreakerMetrics,
  type CircuitBreakerMetricsRecorder,
} from '@gravito/resilience'
