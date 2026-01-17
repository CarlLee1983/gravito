/**
 * Redis Error
 * @description Standardized error type for Redis operations
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
