/**
 * Multi-priority queue depth tracking
 */
export interface MultiPriorityQueueDepth {
  /** Queue depth for CRITICAL priority events */
  critical: number
  /** Queue depth for HIGH priority events */
  high: number
  /** Queue depth for NORMAL priority events */
  normal: number
  /** Queue depth for LOW priority events */
  low: number
  /** Total queue depth across all priorities */
  total: number
}

/**
 * Window adjustment record for backpressure feedback (FS-103)
 * Records when and why the aggregation window was adjusted.
 * @internal
 */
export interface WindowAdjustment {
  /** Timestamp of the adjustment */
  timestamp: number
  /** Previous window size in milliseconds */
  from: number
  /** New window size in milliseconds */
  to: number
  /** Backpressure state that triggered the adjustment */
  reason: string
}

/**
 * Dead letter queue routing decision (FS-103)
 * Determines whether an event should be routed to the DLQ.
 * @internal
 */
export interface DeadLetterDecision {
  /** Whether the event should be routed to DLQ */
  shouldRoute: boolean
  /** Reason for the decision (if applicable) */
  reason?: string
  /** Suggested retry strategy */
  retryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
}
