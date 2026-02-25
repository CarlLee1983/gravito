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
export type {
  BackpressureConfig,
  BufferedMessage,
  ConsumerLifecycleState,
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaMessage,
  KafkaProducerClient,
  LifecycleEvent,
  SubscribeOptions,
} from './types'
