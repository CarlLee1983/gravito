/**
 * Kafka Queue Driver
 *
 * Phase 6A-6B-6C implementation: Complete Kafka integration with reactive notifications,
 * consumer lifecycle management, and backpressure control
 *
 * @public
 */
export { KafkaDriver } from './KafkaDriver'
export {
  KafkaNotifier,
} from './KafkaNotifier'
export type {
  CallbackCompletedEvent,
  MessageArrivedEvent,
} from './KafkaNotifier'
export {
  MessageBuffer,
} from './MessageBuffer'
export {
  OffsetTracker,
} from './OffsetTracker'
export {
  BackpressureController,
} from './BackpressureController'
export {
  ConsumerLifecycleManager,
} from './ConsumerLifecycleManager'
export {
  HeartbeatManager,
} from './HeartbeatManager'
export {
  KafkaMetrics,
} from './KafkaMetrics'
export type {
  BackpressureConfig,
  BufferedMessage,
  ConsumerLifecycleState,
  HeartbeatConfig,
  HeartbeatStatus,
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaDriverMetrics,
  KafkaMessage,
  KafkaProducerClient,
  LifecycleEvent,
  MetricsConfig,
  SubscribeOptions,
} from './types'
