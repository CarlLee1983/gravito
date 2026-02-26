/**
 * @gravito/stream Kafka Driver 模組。
 *
 * 提供生產級的 Kafka Queue 驅動程式實作，
 * 整合 ReactiveStrategy 和完整的 QueueDriver 介面。
 *
 * @public
 */

export { BackpressureController } from './BackpressureController'
export { BatchProcessor } from './BatchProcessor'
export { ConsumerLifecycleManager } from './ConsumerLifecycleManager'
export { ErrorCategorizer } from './ErrorCategorizer'
export { ErrorRecoveryManager } from './ErrorRecoveryManager'
export { HeartbeatManager } from './HeartbeatManager'
export { KafkaDriver } from './KafkaDriver'
export { KafkaMetrics } from './KafkaMetrics'
export { KafkaNotifier } from './KafkaNotifier'
export { MessageBuffer } from './MessageBuffer'
export { OffsetTracker } from './OffsetTracker'
export { PerformanceMonitor } from './PerformanceMonitor'
export { RebalanceHandler } from './RebalanceHandler'
export type {
  BufferedMessage,
  ConsumerLifecycleState,
  DlqStats,
  ErrorCategory,
  ErrorRecoveryConfig,
  ErrorRecoveryState,
  HeartbeatConfig,
  HeartbeatStatus,
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaMessage,
  KafkaProducerClient,
  LifecycleEvent,
  MetricsConfig,
  PartitionAssignment,
  PerformanceConfig,
  PerformanceSnapshot,
  RebalanceConfig,
  RebalanceEvent,
  RebalanceState,
  RebalanceStatus,
  SerializationErrorRecord,
  SubscribeOptions,
} from './types'
