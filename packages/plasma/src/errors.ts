/**
 * Standardized error type for Redis operations.
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
 */
export class RedisError extends Error {
  constructor(
    message: string,
    public readonly command?: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'RedisError'
  }
}
