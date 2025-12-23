/**
 * Redis Client
 * @description Low-level Redis client wrapper for ioredis
 */

import type {
  PipelineResult,
  RedisClientContract,
  RedisConfig,
  RedisPipelineContract,
  ScanOptions,
  ScanResult,
  SetOptions,
  ZAddOptions,
  ZRangeOptions,
} from './types'

/**
 * Redis Client
 * Provides a type-safe wrapper around ioredis
 */
export class RedisClient implements RedisClientContract {
  private client: IORedisClient | null = null
  private subscriber: IORedisClient | null = null
  private subscriptions = new Map<string, (message: string, channel: string) => void>()
  private connected = false
  private ioredis: IORedisModule | null = null

  constructor(private readonly config: RedisConfig = {}) {}

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the Redis server.
   *
   * Initializes the ioredis client and establishes a connection.
   *
   * @returns A promise that resolves when connected.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    this.ioredis = await this.loadIORedis()

    const options: IORedisOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
      db: this.config.db ?? 0,
      connectTimeout: this.config.connectTimeout ?? 10000,
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      lazyConnect: true,
    }

    // Only set optional properties if defined
    if (this.config.password) {
      options.password = this.config.password
    }
    if (this.config.commandTimeout) {
      options.commandTimeout = this.config.commandTimeout
    }
    if (this.config.keyPrefix) {
      options.keyPrefix = this.config.keyPrefix
    }
    if (this.config.retryDelay) {
      options.retryStrategy = () => this.config.retryDelay
    }

    if (this.config.tls) {
      options.tls = typeof this.config.tls === 'boolean' ? {} : { ...this.config.tls }
    }

    this.client = new this.ioredis.default(options)
    await this.client.connect()
    this.connected = true
  }

  /**
   * Disconnect from the Redis server.
   *
   * Closes the connection and resets the client state.
   *
   * @returns A promise that resolves when disconnected.
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit()
      this.subscriber = null
    }

    if (this.client) {
      await this.client.quit()
      this.client = null
    }

    this.subscriptions.clear()
    this.connected = false
  }

  /**
   * Check if the client is connected.
   *
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Ping the Redis server.
   *
   * @returns A promise resolving to 'PONG'.
   */
  async ping(): Promise<string> {
    return await this.getClient().ping()
  }

  /**
   * Load ioredis module dynamically.
   *
   * @returns A promise resolving to the ioredis module.
   * @throws {Error} If ioredis is not installed.
   */
  private async loadIORedis(): Promise<IORedisModule> {
    try {
      const ioredis = await import('ioredis')
      return ioredis as unknown as IORedisModule
    } catch {
      throw new Error(
        'Redis client requires the "ioredis" package. Please install it: bun add ioredis'
      )
    }
  }

  /**
   * Get the Redis client, throw if not connected.
   *
   * @returns The IORedisClient instance.
   * @throws {Error} If not connected.
   */
  private getClient(): IORedisClient {
    if (!this.client) {
      throw new Error('Redis client not connected. Call connect() first.')
    }
    return this.client
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
  async get(key: string): Promise<string | null> {
    return await this.getClient().get(key)
  }

  /**
   * Set a key's value.
   *
   * @param key - The key to set.
   * @param value - The value to set.
   * @param options - Optional SET arguments (EX, PX, NX, XX).
   * @returns A promise resolving to 'OK' or null (if condition not met).
   */
  async set(key: string, value: string, options?: SetOptions): Promise<'OK' | null> {
    const client = this.getClient()
    const args: unknown[] = [key, value]

    if (options?.ex) {
      args.push('EX', options.ex)
    }
    if (options?.px) {
      args.push('PX', options.px)
    }
    if (options?.nx) {
      args.push('NX')
    }
    if (options?.xx) {
      args.push('XX')
    }
    if (options?.keepttl) {
      args.push('KEEPTTL')
    }

    return (await (client as IORedisClientWithCall).call('SET', ...args)) as 'OK' | null
  }

  /**
   * Delete keys.
   *
   * @param keys - The keys to delete.
   * @returns A promise resolving to the number of keys deleted.
   */
  async del(...keys: string[]): Promise<number> {
    return await this.getClient().del(...keys)
  }

  /**
   * Check if keys exist.
   *
   * @param keys - The keys to check.
   * @returns A promise resolving to the number of keys that exist.
   */
  async exists(...keys: string[]): Promise<number> {
    return await this.getClient().exists(...keys)
  }

  /**
   * Increment a key.
   *
   * @param key - The key to increment.
   * @returns A promise resolving to the new value.
   */
  async incr(key: string): Promise<number> {
    return await this.getClient().incr(key)
  }

  /**
   * Increment a key by amount.
   *
   * @param key - The key to increment.
   * @param increment - The amount to increment by.
   * @returns A promise resolving to the new value.
   */
  async incrby(key: string, increment: number): Promise<number> {
    return await this.getClient().incrby(key, increment)
  }

  /**
   * Decrement a key.
   *
   * @param key - The key to decrement.
   * @returns A promise resolving to the new value.
   */
  async decr(key: string): Promise<number> {
    return await this.getClient().decr(key)
  }

  /**
   * Decrement a key by amount.
   *
   * @param key - The key to decrement.
   * @param decrement - The amount to decrement by.
   * @returns A promise resolving to the new value.
   */
  async decrby(key: string, decrement: number): Promise<number> {
    return await this.getClient().decrby(key, decrement)
  }

  /**
   * Append value to a key.
   *
   * @param key - The key to append to.
   * @param value - The value to append.
   * @returns A promise resolving to the new length.
   */
  async append(key: string, value: string): Promise<number> {
    return await this.getClient().append(key, value)
  }

  /**
   * Get the length of the value of a key.
   *
   * @param key - The key.
   * @returns A promise resolving to the string length.
   */
  async strlen(key: string): Promise<number> {
    return await this.getClient().strlen(key)
  }

  /**
   * Set key value and return old value.
   *
   * @param key - The key.
   * @param value - The new value.
   * @returns A promise resolving to the old value or null.
   */
  async getset(key: string, value: string): Promise<string | null> {
    return await this.getClient().getset(key, value)
  }

  /**
   * Get multiple keys.
   *
   * @param keys - The keys to retrieve.
   * @returns A promise resolving to an array of values (or nulls).
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    return await this.getClient().mget(...keys)
  }

  /**
   * Set multiple keys.
   *
   * @param pairs - An object of key-value pairs to set.
   * @returns A promise resolving to 'OK'.
   */
  async mset(pairs: Record<string, string>): Promise<'OK'> {
    const args = Object.entries(pairs).flat()
    return await this.getClient().mset(...args)
  }

  // ============================================================================
  // TTL Operations
  // ============================================================================

  async expire(key: string, seconds: number): Promise<number> {
    return await this.getClient().expire(key, seconds)
  }

  async expireat(key: string, timestamp: number): Promise<number> {
    return await this.getClient().expireat(key, timestamp)
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    return await this.getClient().pexpire(key, milliseconds)
  }

  async ttl(key: string): Promise<number> {
    return await this.getClient().ttl(key)
  }

  async pttl(key: string): Promise<number> {
    return await this.getClient().pttl(key)
  }

  async persist(key: string): Promise<number> {
    return await this.getClient().persist(key)
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  async hget(key: string, field: string): Promise<string | null> {
    return await this.getClient().hget(key, field)
  }

  async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string
  ): Promise<number> {
    const client = this.getClient()
    if (typeof fieldOrData === 'string' && value !== undefined) {
      return await client.hset(key, fieldOrData, value)
    }
    const data = fieldOrData as Record<string, string>
    const args = Object.entries(data).flat()
    return await client.hset(key, ...args)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.getClient().hdel(key, ...fields)
  }

  async hexists(key: string, field: string): Promise<number> {
    return await this.getClient().hexists(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.getClient().hgetall(key)
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.getClient().hincrby(key, field, increment)
  }

  async hkeys(key: string): Promise<string[]> {
    return await this.getClient().hkeys(key)
  }

  async hvals(key: string): Promise<string[]> {
    return await this.getClient().hvals(key)
  }

  async hlen(key: string): Promise<number> {
    return await this.getClient().hlen(key)
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    return await this.getClient().hmget(key, ...fields)
  }

  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    const args = Object.entries(data).flat()
    return await this.getClient().hmset(key, ...args)
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.getClient().lpush(key, ...values)
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return await this.getClient().rpush(key, ...values)
  }

  async lpop(key: string): Promise<string | null> {
    return await this.getClient().lpop(key)
  }

  async rpop(key: string): Promise<string | null> {
    return await this.getClient().rpop(key)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.getClient().lrange(key, start, stop)
  }

  async llen(key: string): Promise<number> {
    return await this.getClient().llen(key)
  }

  async lindex(key: string, index: number): Promise<string | null> {
    return await this.getClient().lindex(key, index)
  }

  async lset(key: string, index: number, value: string): Promise<'OK'> {
    return await this.getClient().lset(key, index, value)
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return await this.getClient().lrem(key, count, value)
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    return await this.getClient().ltrim(key, start, stop)
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return await this.getClient().smembers(key)
  }

  async sismember(key: string, member: string): Promise<number> {
    return await this.getClient().sismember(key, member)
  }

  async scard(key: string): Promise<number> {
    return await this.getClient().scard(key)
  }

  async spop(key: string, count?: number): Promise<string | string[] | null> {
    if (count !== undefined) {
      return await this.getClient().spop(key, count)
    }
    return await this.getClient().spop(key)
  }

  async srandmember(key: string, count?: number): Promise<string | string[] | null> {
    if (count !== undefined) {
      return await this.getClient().srandmember(key, count)
    }
    return await this.getClient().srandmember(key)
  }

  async sunion(...keys: string[]): Promise<string[]> {
    return await this.getClient().sunion(...keys)
  }

  async sinter(...keys: string[]): Promise<string[]> {
    return await this.getClient().sinter(...keys)
  }

  async sdiff(...keys: string[]): Promise<string[]> {
    return await this.getClient().sdiff(...keys)
  }

  // ============================================================================
  // Sorted Set Operations
  // ============================================================================

  async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    const args: (string | number)[] = []
    for (const item of items) {
      args.push(item.score, item.member)
    }
    return await this.getClient().zadd(key, ...args)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().zrem(key, ...members)
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return await this.getClient().zscore(key, member)
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return await this.getClient().zrank(key, member)
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return await this.getClient().zrevrank(key, member)
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    if (options?.withScores) {
      return await this.getClient().zrange(key, start, stop, 'WITHSCORES')
    }
    return await this.getClient().zrange(key, start, stop)
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    if (options?.withScores) {
      return await this.getClient().zrevrange(key, start, stop, 'WITHSCORES')
    }
    return await this.getClient().zrevrange(key, start, stop)
  }

  async zcard(key: string): Promise<number> {
    return await this.getClient().zcard(key)
  }

  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    return await this.getClient().zcount(key, min, max)
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return await this.getClient().zincrby(key, increment, member)
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  async keys(pattern: string): Promise<string[]> {
    return await this.getClient().keys(pattern)
  }

  async scan(cursor: string, options?: ScanOptions): Promise<ScanResult> {
    const args: unknown[] = [cursor]
    if (options?.match) {
      args.push('MATCH', options.match)
    }
    if (options?.count) {
      args.push('COUNT', options.count)
    }

    const [newCursor, keys] = await this.getClient().scan(...args)
    return { cursor: newCursor, keys }
  }

  async type(key: string): Promise<string> {
    return await this.getClient().type(key)
  }

  async rename(key: string, newKey: string): Promise<'OK'> {
    return await this.getClient().rename(key, newKey)
  }

  async renamenx(key: string, newKey: string): Promise<number> {
    return await this.getClient().renamenx(key, newKey)
  }

  // ============================================================================
  // Server Operations
  // ============================================================================

  async flushdb(): Promise<'OK'> {
    return await this.getClient().flushdb()
  }

  async flushall(): Promise<'OK'> {
    return await this.getClient().flushall()
  }

  async dbsize(): Promise<number> {
    return await this.getClient().dbsize()
  }

  async info(section?: string): Promise<string> {
    if (section) {
      return await this.getClient().info(section)
    }
    return await this.getClient().info()
  }

  // ============================================================================
  // Pub/Sub
  // ============================================================================

  async publish(channel: string, message: string): Promise<number> {
    return await this.getClient().publish(channel, message)
  }

  /**
   * Subscribe to a channel.
   *
   * @param channel - The channel name.
   * @param callback - The callback function.
   * @returns A promise resolving when subscribed.
   */
  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    if (!this.subscriber) {
      if (!this.ioredis) {
        this.ioredis = await this.loadIORedis()
      }
      this.subscriber = this.getClient().duplicate()

      this.subscriber.on('message', (...args: unknown[]) => {
        const ch = args[0] as string
        const msg = args[1] as string
        const handler = this.subscriptions.get(ch)
        if (handler) {
          handler(msg, ch)
        }
      })
    }

    this.subscriptions.set(channel, callback)
    await this.subscriber.subscribe(channel)
  }

  async unsubscribe(channel: string): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel)
      this.subscriptions.delete(channel)
    }
  }

  // ============================================================================
  // Pipeline
  // ============================================================================

  pipeline(): RedisPipelineContract {
    return new RedisPipeline(this.getClient().pipeline())
  }
}

/**
 * Redis Pipeline
 */
class RedisPipeline implements RedisPipelineContract {
  constructor(private readonly pipe: IORedisChain) {}

  get(key: string): this {
    this.pipe.get(key)
    return this
  }

  set(key: string, value: string, _options?: SetOptions): this {
    this.pipe.set(key, value)
    return this
  }

  del(...keys: string[]): this {
    this.pipe.del(...keys)
    return this
  }

  incr(key: string): this {
    this.pipe.incr(key)
    return this
  }

  decr(key: string): this {
    this.pipe.decr(key)
    return this
  }

  hget(key: string, field: string): this {
    this.pipe.hget(key, field)
    return this
  }

  hset(key: string, field: string, value: string): this {
    this.pipe.hset(key, field, value)
    return this
  }

  hgetall(key: string): this {
    this.pipe.hgetall(key)
    return this
  }

  lpush(key: string, ...values: string[]): this {
    this.pipe.lpush(key, ...values)
    return this
  }

  rpush(key: string, ...values: string[]): this {
    this.pipe.rpush(key, ...values)
    return this
  }

  lpop(key: string): this {
    this.pipe.lpop(key)
    return this
  }

  rpop(key: string): this {
    this.pipe.rpop(key)
    return this
  }

  sadd(key: string, ...members: string[]): this {
    this.pipe.sadd(key, ...members)
    return this
  }

  srem(key: string, ...members: string[]): this {
    this.pipe.srem(key, ...members)
    return this
  }

  smembers(key: string): this {
    this.pipe.smembers(key)
    return this
  }

  sismember(key: string, member: string): this {
    this.pipe.sismember(key, member)
    return this
  }

  scard(key: string): this {
    this.pipe.scard(key)
    return this
  }

  async exec(): Promise<PipelineResult> {
    return (await this.pipe.exec()) as PipelineResult
  }
}

// ============================================================================
// Internal Types for ioredis
// ============================================================================

interface IORedisModule {
  default: new (options: IORedisOptions) => IORedisClient
}

interface IORedisOptions {
  host?: string
  port?: number
  password?: string
  db?: number
  connectTimeout?: number
  commandTimeout?: number
  keyPrefix?: string
  maxRetriesPerRequest?: number
  retryStrategy?: () => number | undefined
  lazyConnect?: boolean
  tls?: Record<string, unknown>
}

// biome-ignore lint/suspicious/noExplicitAny: ioredis has complex method signatures
interface IORedisClient extends Record<string, any> {
  connect(): Promise<void>
  quit(): Promise<'OK'>
  ping(): Promise<string>
  duplicate(): IORedisClient
  pipeline(): IORedisChain
  on(event: string, callback: (...args: unknown[]) => void): void
}

interface IORedisClientWithCall extends IORedisClient {
  call(command: string, ...args: unknown[]): Promise<unknown>
}

// biome-ignore lint/suspicious/noExplicitAny: ioredis pipeline has dynamic methods
interface IORedisChain extends Record<string, any> {
  exec(): Promise<PipelineResult>
}
