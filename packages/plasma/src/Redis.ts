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
 * import { Redis } from '@gravito/plasma'
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
   * Configure Redis connections.
   *
   * @param config - The Redis manager configuration.
   */
  static configure(config: RedisManagerConfig): void {
    manager.configure(config)
  }

  /**
   * Add a named connection.
   *
   * @param name - The name of the connection.
   * @param config - The connection configuration.
   */
  static addConnection(name: string, config: RedisConfig): void {
    manager.addConnection(name, config)
  }

  /**
   * Get a specific connection.
   *
   * @param name - The name of the connection (optional). Defaults to the configured default.
   * @returns The RedisClientContract instance.
   */
  static connection(name?: string): RedisClientContract {
    return manager.connection(name)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the default Redis server.
   *
   * @returns A promise that resolves when connected.
   */
  static async connect(): Promise<void> {
    await manager.getDefault().connect()
  }

  /**
   * Connect all configured connections.
   *
   * @returns A promise that resolves when all connections are established.
   */
  static async connectAll(): Promise<void> {
    await manager.connectAll()
  }

  /**
   * Disconnect from the default Redis server.
   *
   * @returns A promise that resolves when disconnected.
   */
  static async disconnect(): Promise<void> {
    await manager.getDefault().disconnect()
  }

  /**
   * Disconnect all connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  static async disconnectAll(): Promise<void> {
    await manager.disconnectAll()
  }

  /**
   * Check if connected to the default server.
   *
   * @returns True if connected, false otherwise.
   */
  static isConnected(): boolean {
    return manager.getDefault().isConnected()
  }

  /**
   * Ping the server.
   *
   * @returns A promise resolving to 'PONG'.
   */
  static async ping(): Promise<string> {
    return await manager.getDefault().ping()
  }

  // ============================================================================
  // String Operations
  // ============================================================================

  /**
   * Get a key's value.
   *
   * @param key - The key to retrieve.
   * @returns A promise resolving to the value string or null if not found.
   */
  static async get(key: string): Promise<string | null> {
    return await manager.getDefault().get(key)
  }

  /**
   * Set a key's value.
   *
   * @param key - The key to set.
   * @param value - The value to set.
   * @param options - Optional SET arguments (EX, PX, NX, XX).
   * @returns A promise resolving to 'OK' or null (if condition not met).
   */
  static async set(key: string, value: string, options?: SetOptions): Promise<'OK' | null> {
    return await manager.getDefault().set(key, value, options)
  }

  /**
   * Delete keys.
   *
   * @param keys - The keys to delete.
   * @returns A promise resolving to the number of keys deleted.
   */
  static async del(...keys: string[]): Promise<number> {
    return await manager.getDefault().del(...keys)
  }

  /**
   * Check if keys exist.
   *
   * @param keys - The keys to check.
   * @returns A promise resolving to the number of keys that exist.
   */
  static async exists(...keys: string[]): Promise<number> {
    return await manager.getDefault().exists(...keys)
  }

  /**
   * Increment a key.
   *
   * @param key - The key to increment.
   * @returns A promise resolving to the new value.
   */
  static async incr(key: string): Promise<number> {
    return await manager.getDefault().incr(key)
  }

  /**
   * Increment a key by amount.
   *
   * @param key - The key to increment.
   * @param increment - The amount to increment by.
   * @returns A promise resolving to the new value.
   */
  static async incrby(key: string, increment: number): Promise<number> {
    return await manager.getDefault().incrby(key, increment)
  }

  /**
   * Decrement a key.
   *
   * @param key - The key to decrement.
   * @returns A promise resolving to the new value.
   */
  static async decr(key: string): Promise<number> {
    return await manager.getDefault().decr(key)
  }

  /**
   * Decrement a key by amount.
   *
   * @param key - The key to decrement.
   * @param decrement - The amount to decrement by.
   * @returns A promise resolving to the new value.
   */
  static async decrby(key: string, decrement: number): Promise<number> {
    return await manager.getDefault().decrby(key, decrement)
  }

  /**
   * Get multiple keys.
   *
   * @param keys - The keys to retrieve.
   * @returns A promise resolving to an array of values (or nulls).
   */
  static async mget(...keys: string[]): Promise<(string | null)[]> {
    return await manager.getDefault().mget(...keys)
  }

  /**
   * Set multiple keys.
   *
   * @param pairs - An object of key-value pairs to set.
   * @returns A promise resolving to 'OK'.
   */
  static async mset(pairs: Record<string, string>): Promise<'OK'> {
    return await manager.getDefault().mset(pairs)
  }

  // ============================================================================
  // TTL Operations
  // ============================================================================

  /**
   * Set expiration in seconds.
   *
   * @param key - The key.
   * @param seconds - Expiration time in seconds.
   * @returns A promise resolving to 1 if set, 0 if not.
   */
  static async expire(key: string, seconds: number): Promise<number> {
    return await manager.getDefault().expire(key, seconds)
  }

  /**
   * Get TTL in seconds.
   *
   * @param key - The key.
   * @returns A promise resolving to TTL in seconds, -1 if persistent, -2 if not found.
   */
  static async ttl(key: string): Promise<number> {
    return await manager.getDefault().ttl(key)
  }

  /**
   * Set expiration in milliseconds.
   *
   * @param key - The key.
   * @param milliseconds - Expiration time in milliseconds.
   * @returns A promise resolving to 1 if set, 0 if not.
   */
  static async pexpire(key: string, milliseconds: number): Promise<number> {
    return await manager.getDefault().pexpire(key, milliseconds)
  }

  /**
   * Get TTL in milliseconds.
   *
   * @param key - The key.
   * @returns A promise resolving to TTL in milliseconds.
   */
  static async pttl(key: string): Promise<number> {
    return await manager.getDefault().pttl(key)
  }

  /**
   * Remove expiration.
   *
   * @param key - The key.
   * @returns A promise resolving to 1 if persisted, 0 if not.
   */
  static async persist(key: string): Promise<number> {
    return await manager.getDefault().persist(key)
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  /**
   * Get a hash field value.
   *
   * @param key - The hash key.
   * @param field - The field name.
   * @returns A promise resolving to the value or null.
   */
  static async hget(key: string, field: string): Promise<string | null> {
    return await manager.getDefault().hget(key, field)
  }

  /**
   * Set hash field(s).
   *
   * @param key - The hash key.
   * @param fieldOrData - The field name OR an object of field-value pairs.
   * @param value - The value (if fieldOrData is a string).
   * @returns A promise resolving to the number of fields added.
   */
  static async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string
  ): Promise<number> {
    return await manager.getDefault().hset(key, fieldOrData, value)
  }

  /**
   * Delete hash fields.
   *
   * @param key - The hash key.
   * @param fields - The fields to delete.
   * @returns A promise resolving to the number of fields deleted.
   */
  static async hdel(key: string, ...fields: string[]): Promise<number> {
    return await manager.getDefault().hdel(key, ...fields)
  }

  /**
   * Get all hash fields and values.
   *
   * @param key - The hash key.
   * @returns A promise resolving to an object of field-value pairs.
   */
  static async hgetall(key: string): Promise<Record<string, string>> {
    return await manager.getDefault().hgetall(key)
  }

  /**
   * Increment hash field.
   *
   * @param key - The hash key.
   * @param field - The field name.
   * @param increment - The amount to increment.
   * @returns A promise resolving to the new value.
   */
  static async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await manager.getDefault().hincrby(key, field, increment)
  }

  /**
   * Get all hash keys.
   *
   * @param key - The hash key.
   * @returns A promise resolving to an array of field names.
   */
  static async hkeys(key: string): Promise<string[]> {
    return await manager.getDefault().hkeys(key)
  }

  /**
   * Get all hash values.
   *
   * @param key - The hash key.
   * @returns A promise resolving to an array of values.
   */
  static async hvals(key: string): Promise<string[]> {
    return await manager.getDefault().hvals(key)
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  /**
   * Push values to list head.
   *
   * @param key - The list key.
   * @param values - The values to push.
   * @returns A promise resolving to the list length.
   */
  static async lpush(key: string, ...values: string[]): Promise<number> {
    return await manager.getDefault().lpush(key, ...values)
  }

  /**
   * Push values to list tail.
   *
   * @param key - The list key.
   * @param values - The values to push.
   * @returns A promise resolving to the list length.
   */
  static async rpush(key: string, ...values: string[]): Promise<number> {
    return await manager.getDefault().rpush(key, ...values)
  }

  /**
   * Pop from list head.
   *
   * @param key - The list key.
   * @returns A promise resolving to the value or null.
   */
  static async lpop(key: string): Promise<string | null> {
    return await manager.getDefault().lpop(key)
  }

  /**
   * Pop from list tail.
   *
   * @param key - The list key.
   * @returns A promise resolving to the value or null.
   */
  static async rpop(key: string): Promise<string | null> {
    return await manager.getDefault().rpop(key)
  }

  /**
   * Get list range.
   *
   * @param key - The list key.
   * @param start - Start index.
   * @param stop - Stop index.
   * @returns A promise resolving to an array of values.
   */
  static async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await manager.getDefault().lrange(key, start, stop)
  }

  /**
   * Get list length.
   *
   * @param key - The list key.
   * @returns A promise resolving to the length.
   */
  static async llen(key: string): Promise<number> {
    return await manager.getDefault().llen(key)
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  /**
   * Add members to set.
   *
   * @param key - The set key.
   * @param members - The members to add.
   * @returns A promise resolving to the number of members added.
   */
  static async sadd(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().sadd(key, ...members)
  }

  /**
   * Remove members from set.
   *
   * @param key - The set key.
   * @param members - The members to remove.
   * @returns A promise resolving to the number of members removed.
   */
  static async srem(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().srem(key, ...members)
  }

  /**
   * Get all set members.
   *
   * @param key - The set key.
   * @returns A promise resolving to an array of members.
   */
  static async smembers(key: string): Promise<string[]> {
    return await manager.getDefault().smembers(key)
  }

  /**
   * Check if member exists in set.
   *
   * @param key - The set key.
   * @param member - The member to check.
   * @returns A promise resolving to 1 if exists, 0 otherwise.
   */
  static async sismember(key: string, member: string): Promise<number> {
    return await manager.getDefault().sismember(key, member)
  }

  /**
   * Get set cardinality.
   *
   * @param key - The set key.
   * @returns A promise resolving to the number of members.
   */
  static async scard(key: string): Promise<number> {
    return await manager.getDefault().scard(key)
  }

  // ============================================================================
  // Sorted Set Operations
  // ============================================================================

  /**
   * Add members to sorted set.
   *
   * @param key - The sorted set key.
   * @param items - Items with score and member.
   * @returns A promise resolving to the number of elements added.
   */
  static async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    return await manager.getDefault().zadd(key, ...items)
  }

  /**
   * Remove members from sorted set.
   *
   * @param key - The sorted set key.
   * @param members - The members to remove.
   * @returns A promise resolving to the number of members removed.
   */
  static async zrem(key: string, ...members: string[]): Promise<number> {
    return await manager.getDefault().zrem(key, ...members)
  }

  /**
   * Get member score.
   *
   * @param key - The sorted set key.
   * @param member - The member.
   * @returns A promise resolving to the score or null.
   */
  static async zscore(key: string, member: string): Promise<string | null> {
    return await manager.getDefault().zscore(key, member)
  }

  /**
   * Get range by rank.
   *
   * @param key - The sorted set key.
   * @param start - Start rank.
   * @param stop - Stop rank.
   * @param options - Options (withScores).
   * @returns A promise resolving to an array of members (and scores if requested).
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
   * Get range by rank (reversed).
   *
   * @param key - The sorted set key.
   * @param start - Start rank.
   * @param stop - Stop rank.
   * @param options - Options (withScores).
   * @returns A promise resolving to an array of members.
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
   * Get sorted set cardinality.
   *
   * @param key - The sorted set key.
   * @returns A promise resolving to the number of elements.
   */
  static async zcard(key: string): Promise<number> {
    return await manager.getDefault().zcard(key)
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  /**
   * Find keys by pattern.
   *
   * @param pattern - The pattern to match.
   * @returns A promise resolving to an array of keys.
   */
  static async keys(pattern: string): Promise<string[]> {
    return await manager.getDefault().keys(pattern)
  }

  /**
   * Scan keys.
   *
   * @param cursor - The cursor to start from.
   * @param options - Scan options (MATCH, COUNT).
   * @returns A promise resolving to a ScanResult.
   */
  static async scan(cursor: string, options?: ScanOptions): Promise<ScanResult> {
    return await manager.getDefault().scan(cursor, options)
  }

  /**
   * Get key type.
   *
   * @param key - The key.
   * @returns A promise resolving to the type string.
   */
  static async type(key: string): Promise<string> {
    return await manager.getDefault().type(key)
  }

  // ============================================================================
  // Server Operations
  // ============================================================================

  /**
   * Flush current database.
   *
   * @returns A promise resolving to 'OK'.
   */
  static async flushdb(): Promise<'OK'> {
    return await manager.getDefault().flushdb()
  }

  /**
   * Flush all databases.
   *
   * @returns A promise resolving to 'OK'.
   */
  static async flushall(): Promise<'OK'> {
    return await manager.getDefault().flushall()
  }

  /**
   * Get database size.
   *
   * @returns A promise resolving to the number of keys.
   */
  static async dbsize(): Promise<number> {
    return await manager.getDefault().dbsize()
  }

  /**
   * Get server info.
   *
   * @param section - The info section to retrieve.
   * @returns A promise resolving to the info string.
   */
  static async info(section?: string): Promise<string> {
    return await manager.getDefault().info(section)
  }

  // ============================================================================
  // Pub/Sub
  // ============================================================================

  /**
   * Publish message to channel.
   *
   * @param channel - The channel name.
   * @param message - The message to publish.
   * @returns A promise resolving to the number of subscribers.
   */
  static async publish(channel: string, message: string): Promise<number> {
    return await manager.getDefault().publish(channel, message)
  }

  /**
   * Subscribe to channel.
   *
   * @param channel - The channel name.
   * @param callback - The callback function.
   * @returns A promise resolving when subscribed.
   */
  static async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    return await manager.getDefault().subscribe(channel, callback)
  }

  /**
   * Unsubscribe from channel.
   *
   * @param channel - The channel name.
   * @returns A promise resolving when unsubscribed.
   */
  static async unsubscribe(channel: string): Promise<void> {
    return await manager.getDefault().unsubscribe(channel)
  }

  // ============================================================================
  // Pipeline
  // ============================================================================

  /**
   * Create a pipeline for batch operations.
   *
   * @returns A RedisPipelineContract instance.
   */
  static pipeline(): RedisPipelineContract {
    return manager.getDefault().pipeline()
  }
}
