/**
 * Event dispatch options for async event handling.
 * @public
 */
export interface EventOptions {
  /**
   * Whether to dispatch the event asynchronously.
   * @default false
   */
  async?: boolean

  /**
   * Priority level for event processing.
   * - 'critical': Immediate processing, bypass queue (< 1ms)
   * - 'high': High priority events (< 50ms)
   * - 'normal': Standard events (< 200ms)
   * - 'low': Non-critical events (< 500ms)
   * @default 'normal'
   */
  priority?: 'critical' | 'high' | 'normal' | 'low'

  /**
   * Automatic priority escalation configuration.
   * Events can be automatically upgraded to higher priority based on wait time.
   */
  escalation?: {
    /**
     * Whether to enable automatic priority escalation.
     * @default true
     */
    enabled?: boolean

    /**
     * Escalation thresholds in milliseconds.
     * Events exceeding these wait times are promoted.
     */
    thresholds?: {
      /**
       * Wait time before LOW events are promoted to NORMAL.
       * @default 200
       */
      lowToNormal?: number
      /**
       * Wait time before NORMAL events are promoted to HIGH.
       * @default 100
       */
      normalToHigh?: number
      /**
       * Wait time before HIGH events are promoted to CRITICAL.
       * @default 50
       */
      highToCritical?: number
    }

    /**
     * Maximum wait time before forcing CRITICAL priority.
     * @default 500
     */
    maxWaitTimeMs?: number
  }

  /**
   * Execution timeout in milliseconds.
   * If a listener exceeds this timeout, it will be terminated.
   * @default 5000
   */
  timeout?: number

  /**
   * Ordering guarantee strategy.
   * - 'strict': Global strict ordering (slow, serialized)
   * - 'partition': Partition-based ordering (recommended, balanced)
   * - 'none': No ordering guarantee (fastest, parallel)
   * @default 'none'
   */
  ordering?: 'strict' | 'partition' | 'none'

  /**
   * Partition key for partition-based ordering.
   * Events with the same partition key are processed in order.
   * Only used when ordering is 'partition'.
   * @example 'order:123' or 'user:456'
   */
  partitionKey?: string

  /**
   * Idempotency key for deduplication.
   * Events with the same idempotency key within the TTL window
   * will be processed only once.
   * @example 'order:123:created'
   */
  idempotencyKey?: string

  /**
   * Time-to-live for idempotency key in milliseconds.
   * @default 3600000 (1 hour)
   */
  ttl?: number

  /**
   * Retry policy for failed event processing.
   */
  retry?: {
    /**
     * Maximum number of retry attempts.
     * @default 0
     */
    maxRetries?: number

    /**
     * Backoff strategy for retries.
     * - 'exponential': Delay doubles with each retry (1s, 2s, 4s, 8s...)
     * - 'linear': Fixed delay between retries
     * @default 'exponential'
     */
    backoff?: 'exponential' | 'linear'

    /**
     * Initial delay in milliseconds before first retry.
     * @default 1000
     */
    initialDelayMs?: number

    /**
     * Maximum delay in milliseconds between retries.
     * @default 30000
     */
    maxDelayMs?: number

    /**
     * Whether to send failed events to Dead Letter Queue after max retries.
     * @default false
     */
    dlqAfterMaxRetries?: boolean
  }

  /**
   * Circuit breaker options for this event.
   */
  circuitBreaker?: {
    /**
     * Number of consecutive failures before opening the circuit.
     * @default 5
     */
    failureThreshold?: number

    /**
     * Time in milliseconds to wait before attempting to close the circuit.
     * @default 30000
     */
    resetTimeout?: number

    /**
     * Number of test requests to allow in half-open state.
     * @default 3
     */
    halfOpenRequests?: number
  }

  /**
   * Event aggregation configuration (FS-102).
   * Enables deduplication and micro-batching for improved throughput.
   * @default undefined (disabled)
   */
  aggregation?: {
    /**
     * Enable event aggregation.
     * @default false
     */
    enabled?: boolean

    /**
     * Aggregation window size in milliseconds.
     * Backpressure-aware adjustment: 50-500ms
     * @default 200
     */
    windowMs?: number

    /**
     * Batch size threshold for auto-flush.
     * @default 50
     */
    batchSize?: number

    /**
     * Deduplication strategy.
     * @default 'pattern'
     */
    deduplication?: 'pattern' | 'idempotencyKey' | 'off'

    /**
     * Deduplication pattern (string or function).
     * String: hook-based pattern
     * Function: custom pattern from event args
     */
    pattern?: string | ((args: unknown) => string)

    /**
     * Priority merge strategy.
     * - 'highest': keep highest priority event
     * - 'earliest': keep earliest event
     * - 'latest': keep latest event
     * @default 'highest'
     */
    mergePriority?: 'highest' | 'earliest' | 'latest'

    /**
     * Enable automatic cleanup of expired entries.
     * @default true
     */
    enableCleanup?: boolean

    /**
     * Cleanup interval in milliseconds.
     * @default 300000 (5 minutes)
     */
    cleanupIntervalMs?: number

    /**
     * TTL for entries in milliseconds.
     * @default 600000 (10 minutes)
     */
    ttlMs?: number
  }
}

/**
 * Default event options.
 * @internal
 */
export const DEFAULT_EVENT_OPTIONS: Required<EventOptions> = {
  async: false,
  priority: 'normal',
  timeout: 5000,
  ordering: 'none',
  partitionKey: '',
  idempotencyKey: '',
  ttl: 3600000, // 1 hour
  escalation: {
    enabled: true,
    thresholds: {
      lowToNormal: 200,
      normalToHigh: 100,
      highToCritical: 50,
    },
    maxWaitTimeMs: 500,
  },
  retry: {
    maxRetries: 0,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    dlqAfterMaxRetries: false,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenRequests: 3,
  },
  aggregation: {
    enabled: false,
    windowMs: 200,
    batchSize: 50,
    deduplication: 'pattern',
    pattern: undefined,
    mergePriority: 'highest',
    enableCleanup: true,
    cleanupIntervalMs: 300000,
    ttlMs: 600000,
  },
}
