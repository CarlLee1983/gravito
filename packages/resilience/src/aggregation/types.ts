/**
 * Event aggregation and deduplication types (FS-102)
 * @internal
 */

import { BackpressureState } from '../backpressure'

/**
 * Deduplication statistics.
 */
export interface DeduplicationStats {
  /** Total events submitted */
  totalEvents: number
  /** Events after deduplication */
  deduplicatedEvents: number
  /** Events removed by deduplication */
  removedCount: number
  /** Number of patterns aggregated */
  patternsAggregated: number
  /** Deduplication rate (%) */
  deduplicationRate: number
}

/**
 * Batch submission statistics.
 */
export interface BatchStats {
  /** Total batches submitted */
  totalBatches: number
  /** Total events submitted */
  totalEvents: number
  /** Average batch size */
  averageBatchSize: number
  /** Average batch latency (ms) */
  averageBatchLatency: number
  /** Last flush timestamp */
  lastFlushTime: number
  /** Pending events in queue */
  pendingEvents: number
  /** Auto-triggered flushes */
  autoFlushCount: number
  /** Manual flushes */
  manualFlushCount: number
}

/**
 * Aggregation window statistics.
 */
export interface WindowStats {
  /** Current window size (ms) */
  currentWindowMs: number
  /** Minimum window size (ms) */
  minWindowMs: number
  /** Maximum window size (ms) */
  maxWindowMs: number
  /** Last window adjustment reason */
  lastAdjustmentReason?: string
  /** Window adjustment count */
  adjustmentCount: number
}

/**
 * Complete aggregation statistics.
 */
export interface AggregationStats {
  deduplication: DeduplicationStats
  batching: BatchStats
  window: WindowStats
  timestamp: number
}

/**
 * Aggregation configuration options.
 */
export interface AggregationConfig {
  /** Enable aggregation (default: false) */
  enabled: boolean

  /** Window size in milliseconds (default: 200) */
  windowMs?: number

  /** Batch size threshold (default: 50) */
  batchSize?: number

  /** Deduplication strategy */
  deduplication?: 'pattern' | 'idempotencyKey' | 'off'

  /** Deduplication pattern (string or function) */
  pattern?: string | ((args: unknown) => string)

  /** Merge priority when deduplicating */
  mergePriority?: 'highest' | 'earliest' | 'latest'

  /** Enable background cleanup (default: true) */
  enableCleanup?: boolean

  /** Cleanup interval (ms, default: 5 minutes) */
  cleanupIntervalMs?: number

  /** TTL for deduplication entries (ms, default: 10 minutes) */
  ttlMs?: number
}

/**
 * Default aggregation configuration.
 */
export const DEFAULT_AGGREGATION_CONFIG: Required<AggregationConfig> = {
  enabled: false,
  windowMs: 200,
  batchSize: 50,
  deduplication: 'pattern',
  pattern: (args: unknown) => {
    if (!args || typeof args !== 'object') return 'default'
    const keys = Object.keys(args as Record<string, unknown>).sort()
    return keys.join(':')
  },
  mergePriority: 'highest',
  enableCleanup: true,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  ttlMs: 10 * 60 * 1000, // 10 minutes
}

/**
 * Priority order for merge decisions.
 */
export const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

/**
 * Backpressure-aware window configuration.
 */
export interface WindowAdjustmentConfig {
  /** Window for NORMAL backpressure state */
  normalMs: number
  /** Window for WARNING backpressure state */
  warningMs: number
  /** Window for CRITICAL backpressure state */
  criticalMs: number
  /** Window for OVERFLOW backpressure state */
  overflowMs: number
}

/**
 * Default window adjustment configuration based on backpressure.
 */
export const DEFAULT_WINDOW_ADJUSTMENT: WindowAdjustmentConfig = {
  normalMs: 200,
  warningMs: 150,
  criticalMs: 100,
  overflowMs: 50,
}

/**
 * Get suggested window size based on backpressure state.
 */
export function getSuggestedWindow(
  state: BackpressureState,
  config: WindowAdjustmentConfig = DEFAULT_WINDOW_ADJUSTMENT
): number {
  switch (state) {
    case BackpressureState.NORMAL:
      return config.normalMs
    case BackpressureState.WARNING:
      return config.warningMs
    case BackpressureState.CRITICAL:
      return config.criticalMs
    case BackpressureState.OVERFLOW:
      return config.overflowMs
    default:
      return config.normalMs
  }
}
