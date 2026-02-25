/**
 * Kafka Queue Driver
 *
 * Phase 6A-6B-6C implementation: Complete Kafka integration with reactive notifications,
 * consumer lifecycle management, and backpressure control
 *
 * @public
 */

export { BackpressureController } from './BackpressureController'
export { BatchProcessor } from './BatchProcessor'
export { ConsumerLifecycleManager } from './ConsumerLifecycleManager'
export { ErrorRecoveryManager } from './ErrorRecoveryManager'
export { HeartbeatManager } from './HeartbeatManager'
export { KafkaDriver } from './KafkaDriver'
export { KafkaMetrics } from './KafkaMetrics'
export type {
  CallbackCompletedEvent,
  MessageArrivedEvent,
} from './KafkaNotifier'
export { KafkaNotifier } from './KafkaNotifier'
export { MessageBuffer } from './MessageBuffer'
export { OffsetTracker } from './OffsetTracker'
export { PerformanceMonitor } from './PerformanceMonitor'
export type { RebalanceCallbacks } from './RebalanceHandler'
export { RebalanceHandler } from './RebalanceHandler'
export { RingBuffer } from './RingBuffer'
export type {
  BackpressureConfig,
  BatchConfig,
  BatchResult,
  BufferedMessage,
  ConsumerLifecycleState,
  ErrorRecoveryConfig,
  ErrorRecoveryState,
  HeartbeatConfig,
  HeartbeatStatus,
  KafkaAdminClient,
  KafkaCircuitState,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaDriverMetrics,
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
  SubscribeOptions,
} from './types'
