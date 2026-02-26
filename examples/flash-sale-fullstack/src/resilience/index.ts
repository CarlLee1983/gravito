/**
 * Resilience Module Export
 */

export {
  getResilienceContext,
  initializeResilience,
  type ResilienceContext,
  shutdownResilience,
} from './config'

export {
  addEventForDeduplication,
  addToDeadLetterQueue,
  clearDeduplication,
  executeWithInventoryCircuitBreaker,
  executeWithPaymentCircuitBreaker,
  getBackpressureStatus,
  getCircuitBreakerMetrics,
  getDeadLetterQueueEntries,
  getDeadLetterQueueStats,
  getDeduplicated,
  getResilienceMetrics,
} from './utils'
