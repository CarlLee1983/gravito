/**
 * Kafka Queue Driver
 *
 * Phase 6A-6B-6C implementation: Complete Kafka integration with reactive notifications,
 * consumer lifecycle management, and backpressure control
 *
 * @public
 */

export { BackpressureController } from './BackpressureController'
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
export type { RebalanceCallbacks } from './RebalanceHandler'
export { RebalanceHandler } from './RebalanceHandler'
export type {
  BackpressureConfig,
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
  RebalanceConfig,
  RebalanceEvent,
  RebalanceState,
  RebalanceStatus,
  SubscribeOptions,
} from './types'
