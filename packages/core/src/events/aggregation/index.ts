/**
 * Event aggregation and deduplication module (FS-102)
 * @public
 */

export { AggregationWindow } from './AggregationWindow'
export { DeduplicationManager } from './DeduplicationManager'
export { EventAggregationManager } from './EventAggregationManager'
export { EventBatcher } from './EventBatcher'

export type {
  AggregationConfig,
  AggregationStats,
  BatchStats,
  DeduplicationStats,
  WindowAdjustmentConfig,
  WindowStats,
} from './types'
export {
  DEFAULT_AGGREGATION_CONFIG,
  DEFAULT_WINDOW_ADJUSTMENT,
  getSuggestedWindow,
  PRIORITY_ORDER,
} from './types'
