/**
 * Redis Facade
 * @description Static entry point for Redis operations (Laravel-style)
 */

import { RedisManager } from './RedisManager'
import type {
  RedisClientContract,
  RedisConfig,
  RedisManagerConfig,
  RedisPipelineContract,
  ScanOptions,
  ScanResult,
  SetOptions,
  ZAddOptions,
  ZRangeOptions,
} from './types'

// Singleton manager instance
const manager = new RedisManager()

/**
 * Redis Facade
 * Provides static methods for Redis operations
 *
 * @example
 * ```typescript
 * import { Redis } from '@gravito/orbit-redis'
 *
 * // Configure
 * Redis.configure({
 *   default: 'main',
 *   connections: {
 *     main: { host: 'localhost', port: 6379 }
 *   }
 * })
 *
 * // Connect
 * await Redis.connect()
 *
 * // Use
 * await Redis.set('key', 'value', { ex: 3600 })
 * const value = await Redis.get('key')
 * ```
 */
export class Redis {
  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Configure Redis connections
   */
  static configure(config: RedisManagerConfig): void {
    manager.configure(config)
  }

  /**
   * Add a named connection
   */
  static addConnection(name: string, config: RedisConfig): void {
    manager.addConnection(name, config)
  }

  /**
   * Get a specific connection
   */
  static connection(name?: string): RedisClientContract {
    return manager.connection(name)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the default Redis server
   */
  static async connect(): Promise<void> {
    await manager.getDefault().connect()
  }

  /**
   * Connect all configured connections
   */
  static async connectAll(): Promise<void> {
    await manager.connectAll()
  }

  /**
   * Disconnect from the default Redis server
   */
  static async disconnect(): Promise<void> {
    await manager.getDefault().disconnect()
  }

  /**
   * Disconnect all connections
   */
  static async disconnectAll(): Promise<void> {
    await manager.disconnectAll()
  }

  /**
   * Check if connected
   */
  static isConnected(): boolean {
    return manager.getDefault().isConnected()
  }

  /**
   * Ping the server
   */
  static async ping(): Promise<string> {
    return await manager.getDefault().ping()
  }

  // ============================================================================
  // String Operations
  // ============================================================================

  /**
   * Get a key's value
   */
  static async get(key: string): Promise<string | null> {
    return await manager.getDefault().get(key)
  }

  /**
   * Set a key's value
   */
  static async set(key: string, value: string, options?: SetOptions): Promise<'OK' | null> {
    return await manager.getDefault().set(key, value, options)
  }

  /**
   * Delete keys
   */
  static async del(...keys: string[]): Promise<number> {
    return await manager.getDefault().del(...keys)
  }

  /**
   * Check if keys exist
   */
  static async exists(...keys: string[]): Promise<number> {
    return await manager.getDefault().exists(...keys)
  }

  /**
   * Increment a key
   */
  static async incr(key: string): Promise<number> {
    return await manager.getDefault().incr(key)
  }

  /**
   * Increment a key by amount
   */
  static async incrby(key: string, increment: number): Promise<number> {
    return await manager.getDefault().incrby(key, increment)
  }

  /**
   * Decrement a key
   */
  static async decr(key: string): Promise<number> {
    return await manager.getDefault().decr(key)
  }

  /**
   * Decrement a key by amount
   */
  static async decrby(key: string, decrement: number): Promise<number> {
    return await manager.getDefault().decrby(key, decrement)
  }

  /**
   * Get multiple keys
   */
  static async mget(...keys: string[]): Promise<(string | null)[]> {
    return await manager.getDefault().mget(...keys)
  }

  /**
   * Set multiple keys
   */
  static async mset(pairs: Record<string, string>): Promise<'OK'> {
    return await manager.getDefault().mset(pairs)
  }

  // ============================================================================
  // TTL Operations
  // ============================================================================

  /**
   * Set expiration in seconds
   */
  static async expire(key: string, seconds: number): Promise<number> {
    return await manager.getDefault().expire(key, seconds)
  }

  /**
   * Get TTL in seconds
   */
  static async ttl(key: string): Promise<number> {
    return await manager.getDefault().ttl(key)
  }

  /**
   * Set expiration in milliseconds
   */
  static async pexpire(key: string, milliseconds: number): Promise<number> {
    return await manager.getDefault().pexpire(key, milliseconds)
  }

  /**
   * Get TTL in milliseconds
   */
  static async pttl(key: string): Promise<number> {
    return await manager.getDefault().pttl(key)
  }

  /**
   * Remove expiration
   */
  static async persist(key: string): Promise<number> {
    return await manager.getDefault().persist(key)
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  /**
   * Get a hash field value
   */
  static async hget(key: string, field: string): Promise<string | null> {
    return await manager.getDefault().hget(key, field)
  }

  /**
   * Set hash field(s)
   */
  static async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string
  ): Promise<number> {
    return await manager.getDefault().hset(key, fieldOrData, value)
  }

  /**
   * Delete hash fields
   */
  static async hdel(key: string, ...fields: string[]): Promise<number> {
    return await manager.getDefault().hdel(key, ...fields)
  }

  /**
   * Get all hash fields and values
   */
  static async hgetall(key: string): Promise<Record<string, string>> {
    return await manager.getDefault().hgetall(key)
  }

  /**
   * Increment hash field
   */
  static async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await manager.getDefault().hincrby(key, field, increment)
  }

  /**
   * Get all hash keys
   */
  static async hkeys(key: string): Promise<string[]> {
    return await manager.getDefault().hkeys(key)
  }

  /**
   * Get all hash values
   */
  static async hvals(key: string): Promise<string[]> {
    return await manager.getDefault().hvals(key)
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  /**
   * Push values to list head
   */
  static async lpush(key: string, ...values: string[]): Promise<number> {
    return await manager.getDefault().lpush(key, ...values)
  }

  /**
   * Push values to list tail
   */
  static async rpush(key: string, ...values: string[]): Promise<number> {
    return await manager.getDefault().rpush(key, ...values)
  }

  /**
   * Pop from list head
   */
  static async lpop(key: string): Promise<string | null> {
    return await manager.getDefault().lpop(key)
  }

  /**
   * Pop from list tail
   */
  static async rpop(key: string): Promise<string | null> {
    return await manager.getDefault().rpop(key)
  }

  /**
   * Get list range
   */
  static async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await manager.getDefault().lrange(key, start, stop)
  }

  /**
   * Get list length
   */
  static async llen(key: string): Promise<number> {
    return await manager.getDefault().llen(key)
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  /**
   * Add members to set
   */
  static async sadd(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().sadd(key, ...members)
  }

  /**
   * Remove members from set
   */
  static async srem(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().srem(key, ...members)
  }

  /**
   * Get all set members
   */
  static async smembers(key: string): Promise<string[]> {
    return await manager.getDefault().smembers(key)
  }

  /**
   * Check if member exists in set
   */
  static async sismember(key: string, member: string): Promise<number> {
    return await manager.getDefault().sismember(key, member)
  }

  /**
   * Get set cardinality
   */
  static async scard(key: string): Promise<number> {
    return await manager.getDefault().scard(key)
  }

  // ============================================================================
  // Sorted Set Operations
  // ============================================================================

  /**
   * Add members to sorted set
   */
  static async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    return await manager.getDefault().zadd(key, ...items)
  }

  /**
   * Remove members from sorted set
   */
  static async zrem(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().zrem(key, ...members)
  }

  /**
   * Get member score
   */
  static async zscore(key: string, member: string): Promise<string | null> {
    return await manager.getDefault().zscore(key, member)
  }

  /**
   * Get range by rank
   */
  static async zrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    return await manager.getDefault().zrange(key, start, stop, options)
  }

  /**
   * Get range by rank (reversed)
   */
  static async zrevrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    return await manager.getDefault().zrevrange(key, start, stop, options)
  }

  /**
   * Get sorted set cardinality
   */
  static async zcard(key: string): Promise<number> {
    return await manager.getDefault().zcard(key)
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  /**
   * Find keys by pattern
   */
  static async keys(pattern: string): Promise<string[]> {
    return await manager.getDefault().keys(pattern)
  }

  /**
   * Scan keys
   */
  static async scan(cursor: string, options?: ScanOptions): Promise<ScanResult> {
    return await manager.getDefault().scan(cursor, options)
  }

  /**
   * Get key type
   */
  static async type(key: string): Promise<string> {
    return await manager.getDefault().type(key)
  }

  // ============================================================================
  // Server Operations
  // ============================================================================

  /**
   * Flush current database
   */
  static async flushdb(): Promise<'OK'> {
    return await manager.getDefault().flushdb()
  }

  /**
   * Flush all databases
   */
  static async flushall(): Promise<'OK'> {
    return await manager.getDefault().flushall()
  }

  /**
   * Get database size
   */
  static async dbsize(): Promise<number> {
    return await manager.getDefault().dbsize()
  }

  /**
   * Get server info
   */
  static async info(section?: string): Promise<string> {
    return await manager.getDefault().info(section)
  }

  // ============================================================================
  // Pub/Sub
  // ============================================================================

  /**
   * Publish message to channel
   */
  static async publish(channel: string, message: string): Promise<number> {
    return await manager.getDefault().publish(channel, message)
  }

  /**
   * Subscribe to channel
   */
  static async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    return await manager.getDefault().subscribe(channel, callback)
  }

  /**
   * Unsubscribe from channel
   */
  static async unsubscribe(channel: string): Promise<void> {
    return await manager.getDefault().unsubscribe(channel)
  }

  // ============================================================================
  // Pipeline
  // ============================================================================

  /**
   * Create a pipeline for batch operations
   */
  static pipeline(): RedisPipelineContract {
    return manager.getDefault().pipeline()
  }
}
