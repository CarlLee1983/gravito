import { EventEmitter } from 'node:events'
import { RedisError } from '../errors'
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
} from '../types'
import type { RedisClient, RedisClientOptions, TLSOptions } from './types'
import {
  HashCommands,
  ListCommands,
  PubSubCommands,
  SetCommands,
  StringCommands,
} from './commands'

/**
 * Native Bun.redis Client Implementation
 *
 * High-performance Redis client leveraging Bun's native TCP implementation
 * for optimal throughput and memory efficiency. Automatically selected in
 * 'auto' mode when running on Bun runtime with Bun.redis support.
 *
 * Features exponential backoff retry logic and comprehensive error normalization.
 * Command operations are delegated to specialized command modules:
 * - StringCommands: GET, SET, MGET, MSET, INCR, DECR, etc.
 * - HashCommands: HGET, HSET, HMGET, HGETALL, etc.
 * - ListCommands: LPUSH, RPUSH, LPOP, LRANGE, etc.
 * - SetCommands: SADD, SREM, SMEMBERS, ZADD, ZRANGE, etc.
 * - PubSubCommands: PUBLISH, SUBSCRIBE, UNSUBSCRIBE
 *
 * @example
 * ```typescript
 * const client = new BunRedisClient({ host: 'localhost', port: 6379 });
 * await client.connect();
 * await client.set('key', 'value', { ex: 60 });
 * await client.disconnect();
 * ```
 */
export class BunRedisClient implements RedisClientContract {
  private client: RedisClient | null = null
  private connected = false
  private emitter = new EventEmitter()

  // 命令模組（組合模式）
  private readonly stringCmds: StringCommands
  private readonly hashCmds: HashCommands
  private readonly listCmds: ListCommands
  private readonly setCmds: SetCommands
  private readonly pubsubCmds: PubSubCommands

  /**
   * Initialize a new BunRedisClient instance.
   *
   * @param config - Redis configuration options including host, port, and retry strategy.
   */
  constructor(private readonly config: RedisConfig = {}) {
    // 建立共用 context，讓所有命令模組存取底層連線
    const ctx = {
      getClient: () => this.getClient(),
      prefixKey: (key: string) => this.prefixKey(key),
      sendCommand: (command: string, args?: string[]) => this.sendCommand(command, args),
      handleException: (error: unknown, command?: string) => this.handleException(error, command),
      existsToNumber: (result: boolean) => this.existsToNumber(result),
      buildConnectionUrl: () => this.buildConnectionUrl(),
      buildClientOptions: () => this.buildClientOptions(),
      getRedisClientClass: () => this.getRedisClientClass(),
    }

    this.stringCmds = new StringCommands(ctx)
    this.hashCmds = new HashCommands(ctx)
    this.listCmds = new ListCommands(ctx)
    this.setCmds = new SetCommands(ctx)
    this.pubsubCmds = new PubSubCommands(ctx)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establish connection with automatic retry.
   *
   * Uses exponential backoff with jitter to gracefully handle transient
   * network failures. Emits 'connect' and 'ready' events on success.
   *
   * @returns Promise resolving when Redis handshake completes.
   * @throws {RedisError} When max retries exceeded or authentication fails.
   *
   * @example
   * ```typescript
   * const client = new BunRedisClient({ host: 'localhost', maxRetries: 5 });
   * await client.connect();
   * ```
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    const url = this.buildConnectionUrl()
    const options = this.buildClientOptions()

    const RedisClientClass = await this.getRedisClientClass()
    this.client = new RedisClientClass(url, options) as unknown as RedisClient

    // 連接到 Redis
    try {
      await this.retryWithBackoff(async () => {
        if (this.client) {
          await this.client.connect()
        }
      })

      this.connected = true
      this.emitter.emit('connect')
      this.emitter.emit('ready')
    } catch (error) {
      throw this.handleException(error, 'CONNECT')
    }
  }

  /**
   * Execute operation with exponential backoff retry strategy.
   *
   * Implements truncated exponential backoff with random jitter to prevent
   * thundering herd during Redis server restarts or network partitions.
   *
   * @param operation - Async function to retry on failure.
   * @throws {Error} When all retry attempts exhausted.
   */
  private async retryWithBackoff(operation: () => Promise<void>): Promise<void> {
    const maxRetries = this.config.maxRetries ?? 10
    const baseDelay = this.config.retryDelay ?? 100 // Default 100ms
    let attempt = 0

    while (true) {
      try {
        await operation()
        return
      } catch (error) {
        attempt++
        if (attempt > maxRetries) {
          throw error
        }

        // Exponential backoff with jitter: delay * 2^attempt + random(0-100)
        const delay = Math.min(baseDelay * 2 ** (attempt - 1), 3000) + Math.random() * 100
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Terminate connection and release resources.
   *
   * Closes both main client and Pub/Sub subscriber sockets, emits 'close'
   * and 'end' events, and clears subscription registry.
   *
   * @returns Promise resolving when all cleanup complete.
   *
   * @example
   * ```typescript
   * await client.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    const subscriber = this.pubsubCmds.getSubscriber()
    if (subscriber) {
      subscriber.close()
      this.pubsubCmds.clearSubscriptions()
    }

    if (this.client) {
      this.client.close()
      this.client = null
    }

    this.connected = false
    this.emitter.emit('close')
    this.emitter.emit('end')
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.emitter.on(event, callback)
  }

  /**
   * Check if the client is connected.
   *
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    return this.connected && this.client !== null && (this.client.connected ?? false)
  }

  /**
   * Ping the Redis server.
   *
   * @returns A promise resolving to 'PONG'.
   */
  async ping(): Promise<string> {
    const result = await this.getClient().ping()
    return result === 'PONG' ? 'PONG' : String(result)
  }

  /**
   * Health check
   * Verifies the connection is active and responsive
   */
  async checkHealth(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        return false
      }
      const result = await this.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Construct Redis URL from configuration.
   *
   * Assembles redis:// or rediss:// URL with embedded authentication
   * and database selection for Bun.redis connection string.
   *
   * @returns Formatted connection URL (e.g., rediss://:password@host:port/db).
   */
  buildConnectionUrl(): string {
    const host = this.config.host ?? 'localhost'
    const port = this.config.port ?? 6379
    const password = this.config.password
    const db = this.config.db ?? 0

    let url = 'redis://'
    if (password) {
      url += `:${password}@`
    }
    url += `${host}:${port}`
    if (db > 0) {
      url += `/${db}`
    }

    // 處理 TLS
    if (this.config.tls) {
      url = url.replace('redis://', 'rediss://')
    }

    return url
  }

  /**
   * Build client options from config
   */
  buildClientOptions(): RedisClientOptions {
    const options: RedisClientOptions = {
      connectionTimeout: this.config.connectTimeout ?? 10000,
      // We handle retries manually for exponential backoff during initial connection,
      // but let the client handle reconnections (if supported) or we rely on our wrapper.
      // BunRedis native retry is simple, so we keep it low here and manage it ourselves?
      // Actually, maxRetries in Bun.redis is for *connection* attempts?
      // To avoid conflict, we can set this.config.maxRetries for our loop,
      // and pass 1 or 0 to the client to fail fast and let us retry.
      maxRetries: 1, // Let manual loop handle retries
      autoReconnect: true,
      enableOfflineQueue: true,
      enableAutoPipelining: true,
    }

    if (this.config.tls) {
      options.tls = typeof this.config.tls === 'boolean' ? true : (this.config.tls as TLSOptions)
    }

    return options
  }

  /**
   * Get the Redis client, throw if not connected.
   *
   * @returns The RedisClient instance.
   * @throws {Error} If not connected.
   */
  private getClient(): RedisClient {
    if (!this.client || !this.connected) {
      throw new Error('Redis client not connected. Call connect() first.')
    }
    return this.client
  }

  /**
   * Apply key prefix if configured
   */
  private prefixKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}${key}` : key
  }

  /**
   * Convert Bun.redis boolean exists result to number
   */
  private existsToNumber(result: boolean): number {
    return result ? 1 : 0
  }

  /**
   * Get RedisClient class (for testing override)
   */
  protected async getRedisClientClass(): Promise<any> {
    const { RedisClient } = await import('bun')
    return RedisClient
  }

  /**
   * Execute raw Redis protocol command.
   *
   * Low-level interface for commands not exposed by typed API,
   * useful for Redis modules or future protocol additions.
   *
   * @param command - Redis command name (uppercase recommended).
   * @param args - Command arguments as string array.
   * @returns Command-specific response (string, number, array, etc.).
   * @throws {RedisError} On protocol errors or network failures.
   */
  private async sendCommand(command: string, args: string[] = []): Promise<unknown> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun.redis type definition mismatch for send
      const client = this.getClient() as any
      return await client.send(command, args)
    } catch (error) {
      throw this.handleException(error, command)
    }
  }

  /**
   * Normalize errors to RedisError type.
   *
   * Ensures consistent error handling across Bun.redis and ioredis by wrapping
   * native exceptions with command context and original error preservation.
   *
   * @param error - Exception from Bun.redis or network layer.
   * @param command - Redis command that triggered the error.
   * @returns Standardized RedisError instance.
   */
  private handleException(error: unknown, command?: string): RedisError {
    if (error instanceof RedisError) {
      return error
    }
    const message = error instanceof Error ? error.message : String(error)
    return new RedisError(message, command, error)
  }

  // ============================================================================
  // String Operations - 委派至 StringCommands
  // ============================================================================

  async get(key: string): Promise<string | null> {
    return this.stringCmds.get(key)
  }

  async set(key: string, value: string, options?: SetOptions): Promise<'OK' | null> {
    return this.stringCmds.set(key, value, options)
  }

  async incr(key: string): Promise<number> {
    return this.stringCmds.incr(key)
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.stringCmds.incrby(key, increment)
  }

  async decr(key: string): Promise<number> {
    return this.stringCmds.decr(key)
  }

  async decrby(key: string, decrement: number): Promise<number> {
    return this.stringCmds.decrby(key, decrement)
  }

  async append(key: string, value: string): Promise<number> {
    return this.stringCmds.append(key, value)
  }

  async strlen(key: string): Promise<number> {
    return this.stringCmds.strlen(key)
  }

  async getset(key: string, value: string): Promise<string | null> {
    return this.stringCmds.getset(key, value)
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return this.stringCmds.mget(...keys)
  }

  async mset(pairs: Record<string, string>): Promise<'OK'> {
    return this.stringCmds.mset(pairs)
  }

  // ============================================================================
  // Key & TTL Operations
  // ============================================================================

  async del(...keys: string[]): Promise<number> {
    try {
      const prefixedKeys = keys.map((k) => this.prefixKey(k))
      return await this.getClient().del(...prefixedKeys)
    } catch (error) {
      throw this.handleException(error, 'DEL')
    }
  }

  async exists(...keys: string[]): Promise<number> {
    try {
      const prefixedKeys = keys.map((k) => this.prefixKey(k))
      let count = 0
      for (const key of prefixedKeys) {
        const result = await this.getClient().exists(key)
        if (result) {
          count++
        }
      }
      return count
    } catch (error) {
      throw this.handleException(error, 'EXISTS')
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    return this.existsToNumber(await this.getClient().expire(prefixedKey, seconds))
  }

  async expireat(key: string, timestamp: number): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('EXPIREAT', [prefixedKey, String(timestamp)])
    return typeof result === 'number' ? result : Number(result)
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('PEXPIRE', [prefixedKey, String(milliseconds)])
    return typeof result === 'number' ? result : Number(result)
  }

  async ttl(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    return await this.getClient().ttl(prefixedKey)
  }

  async pttl(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('PTTL', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  async persist(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('PERSIST', [prefixedKey])
    if (typeof result === 'boolean') {
      return this.existsToNumber(result)
    }
    return typeof result === 'number' ? result : Number(result)
  }

  // ============================================================================
  // Hash Operations - 委派至 HashCommands
  // ============================================================================

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashCmds.hget(key, field)
  }

  async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string
  ): Promise<number> {
    return this.hashCmds.hset(key, fieldOrData, value)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.hashCmds.hdel(key, ...fields)
  }

  async hexists(key: string, field: string): Promise<number> {
    return this.hashCmds.hexists(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.hashCmds.hgetall(key)
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.hashCmds.hincrby(key, field, increment)
  }

  async hkeys(key: string): Promise<string[]> {
    return this.hashCmds.hkeys(key)
  }

  async hvals(key: string): Promise<string[]> {
    return this.hashCmds.hvals(key)
  }

  async hlen(key: string): Promise<number> {
    return this.hashCmds.hlen(key)
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    return this.hashCmds.hmget(key, ...fields)
  }

  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    return this.hashCmds.hmset(key, data)
  }

  // ============================================================================
  // List Operations - 委派至 ListCommands
  // ============================================================================

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.listCmds.lpush(key, ...values)
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.listCmds.rpush(key, ...values)
  }

  async lpop(key: string): Promise<string | null> {
    return this.listCmds.lpop(key)
  }

  async rpop(key: string): Promise<string | null> {
    return this.listCmds.rpop(key)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.listCmds.lrange(key, start, stop)
  }

  async llen(key: string): Promise<number> {
    return this.listCmds.llen(key)
  }

  async lindex(key: string, index: number): Promise<string | null> {
    return this.listCmds.lindex(key, index)
  }

  async lset(key: string, index: number, value: string): Promise<'OK'> {
    return this.listCmds.lset(key, index, value)
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.listCmds.lrem(key, count, value)
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    return this.listCmds.ltrim(key, start, stop)
  }

  // ============================================================================
  // Set & Sorted Set Operations - 委派至 SetCommands
  // ============================================================================

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.setCmds.sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.setCmds.srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return this.setCmds.smembers(key)
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.setCmds.sismember(key, member)
  }

  async scard(key: string): Promise<number> {
    return this.setCmds.scard(key)
  }

  async spop(key: string, count?: number): Promise<string | string[] | null> {
    return this.setCmds.spop(key, count)
  }

  async srandmember(key: string, count?: number): Promise<string | string[] | null> {
    return this.setCmds.srandmember(key, count)
  }

  async sunion(...keys: string[]): Promise<string[]> {
    return this.setCmds.sunion(...keys)
  }

  async sinter(...keys: string[]): Promise<string[]> {
    return this.setCmds.sinter(...keys)
  }

  async sdiff(...keys: string[]): Promise<string[]> {
    return this.setCmds.sdiff(...keys)
  }

  async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    return this.setCmds.zadd(key, ...items)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.setCmds.zrem(key, ...members)
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return this.setCmds.zscore(key, member)
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return this.setCmds.zrank(key, member)
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return this.setCmds.zrevrank(key, member)
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    return this.setCmds.zrange(key, start, stop, options)
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    return this.setCmds.zrevrange(key, start, stop, options)
  }

  async zcard(key: string): Promise<number> {
    return this.setCmds.zcard(key)
  }

  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    return this.setCmds.zcount(key, min, max)
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return this.setCmds.zincrby(key, increment, member)
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  async keys(pattern: string): Promise<string[]> {
    const result = await this.sendCommand('KEYS', [pattern])
    return Array.isArray(result) ? result.map(String) : []
  }

  async scan(cursor: string, options?: ScanOptions): Promise<ScanResult> {
    const args: string[] = [cursor]

    if (options?.match) {
      args.push('MATCH', options.match)
    }
    if (options?.count) {
      args.push('COUNT', String(options.count))
    }

    const result = await this.sendCommand('SCAN', args)
    // SCAN 返回 [cursor, [keys]]
    if (Array.isArray(result) && result.length === 2) {
      return {
        cursor: String(result[0]),
        keys: Array.isArray(result[1]) ? result[1].map(String) : [],
      }
    }
    return { cursor: '0', keys: [] }
  }

  async type(key: string): Promise<string> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('TYPE', [prefixedKey])
    return String(result)
  }

  async rename(key: string, newKey: string): Promise<'OK'> {
    const prefixedKey = this.prefixKey(key)
    const prefixedNewKey = this.prefixKey(newKey)
    await this.sendCommand('RENAME', [prefixedKey, prefixedNewKey])
    return 'OK'
  }

  async renamenx(key: string, newKey: string): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const prefixedNewKey = this.prefixKey(newKey)
    const result = await this.sendCommand('RENAMENX', [prefixedKey, prefixedNewKey])
    return typeof result === 'number' ? result : Number(result)
  }

  // ============================================================================
  // Server Operations
  // ============================================================================

  async flushdb(): Promise<'OK'> {
    await this.sendCommand('FLUSHDB', [])
    return 'OK'
  }

  async flushall(): Promise<'OK'> {
    await this.sendCommand('FLUSHALL', [])
    return 'OK'
  }

  async dbsize(): Promise<number> {
    const result = await this.sendCommand('DBSIZE', [])
    return typeof result === 'number' ? result : Number(result)
  }

  async info(section?: string): Promise<string> {
    const result = section
      ? await this.sendCommand('INFO', [section])
      : await this.sendCommand('INFO', [])
    return String(result)
  }

  // ============================================================================
  // Pub/Sub Operations - 委派至 PubSubCommands
  // ============================================================================

  async publish(channel: string, message: string): Promise<number> {
    return this.pubsubCmds.publish(channel, message)
  }

  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    return this.pubsubCmds.subscribe(channel, callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    return this.pubsubCmds.unsubscribe(channel)
  }

  // ============================================================================
  // Pipeline
  // ============================================================================

  pipeline(): RedisPipelineContract {
    return new BunRedisPipeline(this)
  }

  /**
   * Execute a Lua script on the server.
   *
   * @param script - The Lua script to execute.
   * @param numKeys - The number of keys that the script will access.
   * @param args - Keys followed by any additional arguments.
   * @returns Promise resolving to the script's return value.
   *
   * @example
   * ```typescript
   * const result = await client.eval('return redis.call("GET", KEYS[1])', 1, 'mykey');
   * ```
   */
  async eval(script: string, numKeys: number, ...args: string[]): Promise<unknown> {
    try {
      return await this.sendCommand('EVAL', [script, numKeys.toString(), ...args])
    } catch (error) {
      throw this.handleException(error, 'EVAL')
    }
  }

  /**
   * Execute a Lua script cached on the server by its SHA1 digest.
   *
   * @param sha1 - The SHA1 digest of the script.
   * @param numKeys - The number of keys that the script will access.
   * @param args - Keys followed by any additional arguments.
   * @returns Promise resolving to the script's return value.
   *
   * @example
   * ```typescript
   * const sha1 = '...';
   * const result = await client.evalsha(sha1, 1, 'mykey');
   * ```
   */
  async evalsha(sha1: string, numKeys: number, ...args: string[]): Promise<unknown> {
    try {
      return await this.sendCommand('EVALSHA', [sha1, numKeys.toString(), ...args])
    } catch (error) {
      throw this.handleException(error, 'EVALSHA')
    }
  }

  // ============================================================================
  // Stream Operations
  // ============================================================================

  /**
   * Add an entry to a stream.
   *
   * @param key - The stream key.
   * @param data - Record of field-value pairs to add.
   * @param options - Optional settings like MAXLEN and ID.
   * @returns Promise resolving to the generated entry ID.
   *
   * @example
   * ```typescript
   * const id = await client.xadd('mystream', { sensor: 'temp', val: '20' }, { maxlen: 1000 });
   * ```
   */
  async xadd(
    key: string,
    data: Record<string, string>,
    options?: import('../types').XAddOptions
  ): Promise<string> {
    const prefixedKey = this.prefixKey(key)
    const args: string[] = [prefixedKey]

    if (options?.maxlen) {
      args.push('MAXLEN')
      if (options.approximate) {
        args.push('~')
      }
      args.push(options.maxlen.toString())
    }

    if (options?.id) {
      args.push(options.id)
    } else {
      args.push('*')
    }

    for (const [field, value] of Object.entries(data)) {
      args.push(field, value)
    }

    const result = await this.sendCommand('XADD', args)
    return String(result)
  }

  /**
   * Read data from one or more streams.
   *
   * Results are normalized to a standard format: `[stream, entries][]`.
   * Bun.redis may return an object format `{ streamKey: entries }`, which this
   * method automatically converts to the standard array-based format.
   *
   * @param streams - Record of stream keys and their corresponding start IDs.
   * @param options - Optional settings like COUNT and BLOCK.
   * @returns Promise resolving to the stream data, or null if no data is available.
   *
   * @example
   * ```typescript
   * const results = await client.xread({ mystream: '0' }, { count: 10 });
   * ```
   */
  async xread(
    streams: Record<string, string>,
    options?: import('../types').XReadOptions
  ): Promise<import('../types').StreamReadResult | null> {
    const args: string[] = []

    if (options?.count) {
      args.push('COUNT', options.count.toString())
    }
    if (options?.block) {
      args.push('BLOCK', options.block.toString())
    }

    args.push('STREAMS')
    const keys: string[] = []
    const ids: string[] = []

    for (const [key, id] of Object.entries(streams)) {
      keys.push(this.prefixKey(key))
      ids.push(id)
    }

    args.push(...keys, ...ids)

    try {
      const result = await this.sendCommand('XREAD', args)
      if (!result) {
        return null
      }

      // Bun.redis returns streams as an object? { streamKey: entries }
      // We need to convert it to standard [stream, entries][] format
      if (!Array.isArray(result) && typeof result === 'object') {
        return Object.entries(result) as any
      }

      // biome-ignore lint/suspicious/noExplicitAny: complex stream response
      return result as any
    } catch (error) {
      throw this.handleException(error, 'XREAD')
    }
  }

  /**
   * Read data from one or more streams as a member of a consumer group.
   *
   * Results are normalized to a standard format: `[stream, entries][]`.
   *
   * @param group - The consumer group name.
   * @param consumer - The consumer name.
   * @param streams - Record of stream keys and their corresponding start IDs (usually '>').
   * @param options - Optional settings like COUNT and BLOCK.
   * @returns Promise resolving to the stream data, or null if no data is available.
   *
   * @example
   * ```typescript
   * const results = await client.xreadgroup('workers', 'c1', { mystream: '>' });
   * ```
   */
  async xreadgroup(
    group: string,
    consumer: string,
    streams: Record<string, string>,
    options?: import('../types').XReadOptions
  ): Promise<import('../types').StreamReadResult | null> {
    const args: string[] = ['GROUP', group, consumer]

    if (options?.count) {
      args.push('COUNT', options.count.toString())
    }
    if (options?.block) {
      args.push('BLOCK', options.block.toString())
    }

    args.push('STREAMS')
    const keys: string[] = []
    const ids: string[] = []

    for (const [key, id] of Object.entries(streams)) {
      keys.push(this.prefixKey(key))
      ids.push(id)
    }

    args.push(...keys, ...ids)

    try {
      const result = await this.sendCommand('XREADGROUP', args)
      if (!result) {
        return null
      }

      // Bun.redis returns streams as an object? { streamKey: entries }
      if (!Array.isArray(result) && typeof result === 'object') {
        return Object.entries(result) as any
      }

      // biome-ignore lint/suspicious/noExplicitAny: complex stream response
      return result as any
    } catch (error) {
      throw this.handleException(error, 'XREADGROUP')
    }
  }

  /**
   * Manage consumer groups.
   *
   * @param command - The XGROUP subcommand (CREATE, DESTROY, DELCONSUMER, SETID).
   * @param key - The stream key.
   * @param group - The consumer group name.
   * @param args - Additional arguments specific to the subcommand.
   * @returns Promise resolving to the command result.
   *
   * @example
   * ```typescript
   * await client.xgroup('CREATE', 'mystream', 'workers', '$', true);
   * ```
   */
  async xgroup(
    command: 'CREATE' | 'DESTROY' | 'DELCONSUMER' | 'SETID',
    key: string,
    group: string,
    ...args: (string | boolean | undefined)[]
  ): Promise<any> {
    const prefixedKey = this.prefixKey(key)
    const cmdArgs: string[] = [command, prefixedKey, group]

    if (command === 'CREATE') {
      const id = (args[0] as string) || '$'
      const mkstream = args[1] as boolean
      cmdArgs.push(id)
      if (mkstream) {
        cmdArgs.push('MKSTREAM')
      }
    } else if (command === 'DELCONSUMER') {
      const consumer = args[0] as string
      cmdArgs.push(consumer)
    } else if (command === 'SETID') {
      const id = args[0] as string
      cmdArgs.push(id)
    }

    const result = await this.sendCommand('XGROUP', cmdArgs)
    return result
  }

  /**
   * Acknowledge one or more messages in a consumer group.
   *
   * @param key - The stream key.
   * @param group - The consumer group name.
   * @param ids - One or more message IDs to acknowledge.
   * @returns Promise resolving to the number of messages acknowledged.
   */
  async xack(key: string, group: string, ...ids: string[]): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('XACK', [prefixedKey, group, ...ids])
    return Number(result)
  }

  /**
   * Get the number of entries in a stream.
   *
   * @param key - The stream key.
   * @returns Promise resolving to the number of entries.
   */
  async xlen(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('XLEN', [prefixedKey])
    return Number(result)
  }

  /**
   * Retrieve a range of entries from a stream.
   *
   * @param key - The stream key.
   * @param start - The start ID (use '-' for the smallest ID).
   * @param end - The end ID (use '+' for the largest ID).
   * @param count - Optional maximum number of entries to return.
   * @returns Promise resolving to an array of stream entries.
   */
  async xrange(
    key: string,
    start: string,
    end: string,
    count?: number
  ): Promise<import('../types').StreamEntry[]> {
    const prefixedKey = this.prefixKey(key)
    const args: string[] = [prefixedKey, start, end]
    if (count) {
      args.push('COUNT', count.toString())
    }
    const result = await this.sendCommand('XRANGE', args)
    // biome-ignore lint/suspicious/noExplicitAny: complex stream response
    return (result as any) || []
  }

  /**
   * Retrieve a range of entries from a stream in reverse order.
   *
   * @param key - The stream key.
   * @param end - The end ID (use '+' for the largest ID).
   * @param start - The start ID (use '-' for the smallest ID).
   * @param count - Optional maximum number of entries to return.
   * @returns Promise resolving to an array of stream entries.
   */
  async xrevrange(
    key: string,
    end: string,
    start: string,
    count?: number
  ): Promise<import('../types').StreamEntry[]> {
    const prefixedKey = this.prefixKey(key)
    const args: string[] = [prefixedKey, end, start]
    if (count) {
      args.push('COUNT', count.toString())
    }
    const result = await this.sendCommand('XREVRANGE', args)
    // biome-ignore lint/suspicious/noExplicitAny: complex stream response
    return (result as any) || []
  }

  /**
   * Trim a stream to a maximum length.
   *
   * @param key - The stream key.
   * @param maxlen - The maximum number of entries to keep.
   * @param approximate - If true, uses the '~' operator for approximate trimming.
   * @returns Promise resolving to the number of entries removed.
   */
  async xtrim(key: string, maxlen: number, approximate?: boolean): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const args: string[] = [prefixedKey, 'MAXLEN']
    if (approximate) {
      args.push('~')
    }
    args.push(maxlen.toString())
    const result = await this.sendCommand('XTRIM', args)
    return Number(result)
  }

  /**
   * Delete one or more entries from a stream.
   *
   * @param key - The stream key.
   * @param ids - One or more message IDs to delete.
   * @returns Promise resolving to the number of entries removed.
   */
  async xdel(key: string, ...ids: string[]): Promise<number> {
    const prefixedKey = this.prefixKey(key)
    const result = await this.sendCommand('XDEL', [prefixedKey, ...ids])
    return Number(result)
  }
}

/**
 * Bun Redis Pipeline
 * Implements pipeline using Bun.redis send commands
 */
class BunRedisPipeline implements RedisPipelineContract {
  private commands: Array<{ method: string; args: unknown[] }> = []

  constructor(private client: BunRedisClient) {}

  get(key: string): this {
    this.commands.push({ method: 'get', args: [key] })
    return this
  }

  set(key: string, value: string, options?: SetOptions): this {
    this.commands.push({ method: 'set', args: [key, value, options] })
    return this
  }

  del(...keys: string[]): this {
    this.commands.push({ method: 'del', args: keys })
    return this
  }

  incr(key: string): this {
    this.commands.push({ method: 'incr', args: [key] })
    return this
  }

  decr(key: string): this {
    this.commands.push({ method: 'decr', args: [key] })
    return this
  }

  hget(key: string, field: string): this {
    this.commands.push({ method: 'hget', args: [key, field] })
    return this
  }

  hset(key: string, field: string, value: string): this {
    this.commands.push({ method: 'hset', args: [key, field, value] })
    return this
  }

  hgetall(key: string): this {
    this.commands.push({ method: 'hgetall', args: [key] })
    return this
  }

  lpush(key: string, ...values: string[]): this {
    this.commands.push({ method: 'lpush', args: [key, ...values] })
    return this
  }

  rpush(key: string, ...values: string[]): this {
    this.commands.push({ method: 'rpush', args: [key, ...values] })
    return this
  }

  lpop(key: string): this {
    this.commands.push({ method: 'lpop', args: [key] })
    return this
  }

  rpop(key: string): this {
    this.commands.push({ method: 'rpop', args: [key] })
    return this
  }

  sadd(key: string, ...members: string[]): this {
    this.commands.push({ method: 'sadd', args: [key, ...members] })
    return this
  }

  srem(key: string, ...members: string[]): this {
    this.commands.push({ method: 'srem', args: [key, ...members] })
    return this
  }

  smembers(key: string): this {
    this.commands.push({ method: 'smembers', args: [key] })
    return this
  }

  sismember(key: string, member: string): this {
    this.commands.push({ method: 'sismember', args: [key, member] })
    return this
  }

  scard(key: string): this {
    this.commands.push({ method: 'scard', args: [key] })
    return this
  }

  async exec(): Promise<PipelineResult> {
    // 執行所有命令並收集結果
    const promises = this.commands.map(async (cmd) => {
      try {
        // @ts-expect-error Dynamic call
        const result = await this.client[cmd.method](...cmd.args)
        return [null, result] as [Error | null, unknown]
      } catch (error) {
        return [error as Error, null] as [Error | null, unknown]
      }
    })

    const results = await Promise.all(promises)

    this.commands = []
    return results
  }
}
