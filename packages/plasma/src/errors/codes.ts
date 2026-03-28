/**
 * Structured error codes for @gravito/plasma Redis operations.
 * Follows fortify's dot-separated namespace convention.
 *
 * @public
 */
export const CacheErrorCodes = {
  // Connection errors
  CONNECTION_FAILED: 'redis.connection_failed',
  CONNECTION_TIMEOUT: 'redis.connection_timeout',

  // Operation errors
  COMMAND_FAILED: 'redis.command_failed',
  TIMEOUT: 'redis.timeout',
  SERIALIZATION_FAILED: 'redis.serialization_failed',

  // Pool errors
  POOL_EXHAUSTED: 'redis.pool_exhausted',
} as const

export type CacheErrorCode = (typeof CacheErrorCodes)[keyof typeof CacheErrorCodes]
