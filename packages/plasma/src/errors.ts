import { CacheException } from '@gravito/core'
import { CacheErrorCodes, type CacheErrorCode } from './errors/codes'

/**
 * Standardized error type for Redis operations.
 * Extends CacheException for unified error handling across Gravito.
 *
 * Provides consistent error handling across all Redis client implementations
 * (Bun.redis and ioredis) by normalizing error formats and attaching
 * diagnostic metadata such as the failed command and original error.
 *
 * @example
 * ```typescript
 * try {
 *   await redis.get('key');
 * } catch (error) {
 *   if (error instanceof RedisError) {
 *     console.error(`Command ${error.command} failed: ${error.message}`);
 *   }
 * }
 * ```
 * @public
 */
export class RedisError extends CacheException {
  public readonly command?: string
  public readonly originalError?: unknown

  constructor(
    message: string,
    code: CacheErrorCode = CacheErrorCodes.COMMAND_FAILED,
    command?: string,
    originalError?: unknown
  ) {
    super(503, code, {
      message,
      cause: originalError,
      retryable:
        code === CacheErrorCodes.CONNECTION_FAILED || code === CacheErrorCodes.CONNECTION_TIMEOUT,
    })
    this.name = 'RedisError'
    this.command = command
    this.originalError = originalError
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Factory: connection failure (retryable)
   * @param message - Human-readable error description
   * @param cause - Underlying cause error
   */
  static connectionFailed(message: string, cause?: unknown): RedisError {
    return new RedisError(message, CacheErrorCodes.CONNECTION_FAILED, 'CONNECT', cause)
  }

  /**
   * Factory: command failure (not retryable)
   * @param message - Human-readable error description
   * @param command - The Redis command that failed
   * @param cause - Underlying cause error
   */
  static commandFailed(message: string, command: string, cause?: unknown): RedisError {
    return new RedisError(message, CacheErrorCodes.COMMAND_FAILED, command, cause)
  }

  /**
   * Factory: timeout
   * @param message - Human-readable error description
   * @param command - The Redis command that timed out
   * @param cause - Underlying cause error
   */
  static timeout(message: string, command?: string, cause?: unknown): RedisError {
    return new RedisError(message, CacheErrorCodes.TIMEOUT, command, cause)
  }
}
