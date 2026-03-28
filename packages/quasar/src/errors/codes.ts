/**
 * Structured error codes for @gravito/quasar queue operations.
 * Follows fortify's dot-separated namespace convention.
 *
 * @public
 */
export const QueueErrorCodes = {
  CONNECTION_FAILED: 'queue.connection_failed',
  PROBE_COLLECTION_FAILED: 'queue.probe_collection_failed',
  BRIDGE_ATTACH_FAILED: 'queue.bridge_attach_failed',
  COMMAND_EXECUTION_FAILED: 'queue.command_execution_failed',
  ENQUEUE_FAILED: 'queue.enqueue_failed',
  DEQUEUE_FAILED: 'queue.dequeue_failed',
} as const

export type QueueErrorCode = (typeof QueueErrorCodes)[keyof typeof QueueErrorCodes]

/**
 * @deprecated Use QueueErrorCodes instead. Will be removed in v3.0.0.
 */
export const ErrorCodes = {
  REDIS_CONNECTION_FAILED: QueueErrorCodes.CONNECTION_FAILED,
  PROBE_COLLECTION_FAILED: QueueErrorCodes.PROBE_COLLECTION_FAILED,
  BRIDGE_ATTACH_FAILED: QueueErrorCodes.BRIDGE_ATTACH_FAILED,
  COMMAND_EXECUTION_FAILED: QueueErrorCodes.COMMAND_EXECUTION_FAILED,
} as const

/**
 * @deprecated Use QueueErrorCode instead.
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
