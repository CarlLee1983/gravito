/**
 * 事件驅動快取系統 - 模塊導出
 */

// 背壓管理
export {
  type BackpressureConfig,
  BackpressureManager,
  BackpressureState,
  type BackpressureStats,
} from './BackpressureManager'
// 聚合器
export {
  type AggregatorConfig,
  type AggregatorStats,
  EventAggregator,
} from './EventAggregator'
// 去重
export {
  type DeduplicationStats,
  EventDeduplicator,
} from './EventDeduplicator'
// 隊列
export { EventQueue } from './EventQueue'
// 優先級管理
export {
  PriorityEscalationManager,
  PriorityStatistics,
} from './priority'
// 類型定義
export {
  type CacheEvent,
  CacheEventType,
  createCacheEvent,
  EVENT_CATEGORIES,
  EVENT_PRIORITY_MAP,
  EventPriority,
  EventSource,
  generateInvalidationPatterns,
  PRIORITY_CONFIG,
} from './types'
