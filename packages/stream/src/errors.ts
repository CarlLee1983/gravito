import { StreamException, type InfrastructureExceptionOptions } from '@gravito/core'

/**
 * Error codes for stream/queue infrastructure errors.
 * Grouped by driver with dot-separated namespaces.
 * @public
 */
export const StreamErrorCodes = {
  // Kafka
  KAFKA_CLIENT_REQUIRED: 'stream.kafka.client_required',
  KAFKA_CONNECTION_FAILED: 'stream.kafka.connection_failed',
  KAFKA_PRODUCE_FAILED: 'stream.kafka.produce_failed',
  KAFKA_CONSUME_FAILED: 'stream.kafka.consume_failed',
  KAFKA_TIMEOUT: 'stream.kafka.timeout',
  KAFKA_SERIALIZATION_ERROR: 'stream.kafka.serialization_error',
  KAFKA_PUSH_MODEL_ONLY: 'stream.kafka.push_model_only',
  // RabbitMQ
  RABBITMQ_CONNECTION_FAILED: 'stream.rabbitmq.connection_failed',
  RABBITMQ_CHANNEL_ERROR: 'stream.rabbitmq.channel_error',
  RABBITMQ_PUBLISH_FAILED: 'stream.rabbitmq.publish_failed',
  // Redis
  REDIS_CONNECTION_FAILED: 'stream.redis.connection_failed',
  REDIS_PUBSUB_NOT_SUPPORTED: 'stream.redis.pubsub_not_supported',
  REDIS_SUBSCRIBE_FAILED: 'stream.redis.subscribe_failed',
  REDIS_PIPELINE_NOT_SUPPORTED: 'stream.redis.pipeline_not_supported',
  REDIS_ZRANGE_NOT_SUPPORTED: 'stream.redis.zrange_not_supported',
  REDIS_ZRANGEBYSCORE_NOT_SUPPORTED: 'stream.redis.zrangebyscore_not_supported',
  REDIS_CLIENT_ACCESS_NOT_SUPPORTED: 'stream.redis.client_access_not_supported',
  REDIS_SET_NOT_SUPPORTED: 'stream.redis.set_not_supported',
  REDIS_EVAL_NOT_SUPPORTED: 'stream.redis.eval_not_supported',
  REDIS_BINARY_PAYLOAD_EXPECTED: 'stream.redis.binary_payload_expected',
  // SQS
  SQS_SEND_FAILED: 'stream.sqs.send_failed',
  SQS_RECEIVE_FAILED: 'stream.sqs.receive_failed',
  SQS_USE_DELETE_MESSAGE: 'stream.sqs.use_delete_message',
  // Database driver
  DATABASE_DRIVER_REQUIRED: 'stream.database.driver_required',
  DATABASE_FALLBACK: 'stream.database.fallback',
  DATABASE_OPERATION_FAILED: 'stream.database.operation_failed',
  // BullMQ
  BULLMQ_QUEUE_REQUIRED: 'stream.bullmq.queue_required',
  // gRPC
  GRPC_PACKAGE_NOT_FOUND: 'stream.grpc.package_not_found',
  GRPC_SERVICE_NOT_FOUND: 'stream.grpc.service_not_found',
  // Memory driver
  MEMORY_QUEUE_FULL: 'stream.memory.queue_full',
  // General
  DRIVER_NOT_FOUND: 'stream.driver_not_found',
  CONNECTION_NOT_FOUND: 'stream.connection_not_found',
  SERIALIZER_NOT_FOUND: 'stream.serializer_not_found',
  CONFIGURATION_ERROR: 'stream.configuration_error',
  CONSUMER_ERROR: 'stream.consumer_error',
  BATCH_PROCESSING_ERROR: 'stream.batch_processing_error',
  CIRCUIT_BREAKER_OPEN: 'stream.circuit_breaker_open',
  QUEUE_NOT_INITIALIZED: 'stream.queue_not_initialized',
  WORKER_ALREADY_RUNNING: 'stream.worker_already_running',
  WORKER_NOT_INITIALIZED: 'stream.worker_not_initialized',
  WORKER_INVALID_METHOD: 'stream.worker_invalid_method',
  CONSUMER_ALREADY_RUNNING: 'stream.consumer_already_running',
  CONSUMER_LIFECYCLE_ERROR: 'stream.consumer_lifecycle_error',
  BACKPRESSURE_CONFIG_ERROR: 'stream.backpressure_config_error',
  RING_BUFFER_CONFIG_ERROR: 'stream.ring_buffer_config_error',
  CONCURRENCY_CONFIG_ERROR: 'stream.concurrency_config_error',
  // Serialization
  SERIALIZATION_INVALID_TYPE: 'stream.serialization.invalid_type',
  SERIALIZATION_MISSING_CLASS_NAME: 'stream.serialization.missing_class_name',
  SERIALIZATION_CLASS_NOT_REGISTERED: 'stream.serialization.class_not_registered',
  SERIALIZATION_UNKNOWN_TYPE: 'stream.serialization.unknown_type',
  SERIALIZATION_RESTORE_FAILED: 'stream.serialization.restore_failed',
  SERIALIZATION_INVALID_REGISTRY: 'stream.serialization.invalid_registry',
  SERIALIZATION_MISSING_HANDLE: 'stream.serialization.missing_handle',
  SERIALIZATION_EMPTY_BUFFER: 'stream.serialization.empty_buffer',
  SERIALIZATION_DECODE_ERROR: 'stream.serialization.decode_error',
  SERIALIZATION_ENCODE_ERROR: 'stream.serialization.encode_error',
  SERIALIZATION_UNSUPPORTED_CBOR: 'stream.serialization.unsupported_cbor',
  SERIALIZATION_MSGPACK_NOT_INSTALLED: 'stream.serialization.msgpack_not_installed',
  SERIALIZATION_PARSE_ERROR: 'stream.serialization.parse_error',
  // Binary frame
  BINARY_FRAME_INVALID: 'stream.binary_frame.invalid',
  BINARY_FRAME_UNSUPPORTED_VERSION: 'stream.binary_frame.unsupported_version',
  BINARY_FRAME_DECODE_ERROR: 'stream.binary_frame.decode_error',
  BINARY_WORKER_EMPTY_BUFFER: 'stream.binary_worker.empty_buffer',
  BINARY_WORKER_PROTOCOL_ERROR: 'stream.binary_worker.protocol_error',
} as const

/**
 * Union type of all stream error codes.
 * @public
 */
export type StreamErrorCode = (typeof StreamErrorCodes)[keyof typeof StreamErrorCodes]

/**
 * Maps an ErrorCategorizer category to the retryable boolean field.
 *
 * Per D-12: only 'transient' errors are retryable. All other categories
 * (serialization, business_logic, permanent) are not retryable.
 *
 * @param category - The error category from ErrorCategorizer.categorize()
 * @returns true if the error should be retried, false otherwise
 * @public
 */
export function isRetryableCategory(category: string): boolean {
  return category === 'transient'
}

/**
 * Standard error class for stream/queue infrastructure failures.
 * Re-parented to StreamException (InfrastructureException → GravitoException).
 *
 * Carries:
 * - `status`: HTTP-like status code (503 for transient, 500 for permanent)
 * - `code`: Dot-namespaced error code from StreamErrorCodes
 * - `retryable`: Whether the operation can be safely retried
 *
 * @example
 * ```typescript
 * throw new StreamError(503, StreamErrorCodes.KAFKA_CONNECTION_FAILED, {
 *   message: 'Kafka broker unreachable',
 *   retryable: true,
 *   cause: originalError
 * })
 * ```
 * @public
 */
export class StreamError extends StreamException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'StreamError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
