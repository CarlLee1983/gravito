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
 * ioredis-based Redis Client Implementation
 *
 * Provides a type-safe, contract-compliant wrapper around the ioredis library
 * for environments where Bun.redis is unavailable (Node.js, legacy Bun versions).
 * Offers full Redis protocol support with connection pooling and Pub/Sub.
 *
 * @example
 * ```typescript
 * const client = new RedisClient({ host: 'localhost', port: 6379 });
 * await client.connect();
 * await client.set('key', 'value', { ex: 60 });
 * const value = await client.get('key');
 * await client.disconnect();
 * ```
 */
export class RedisClient implements RedisClientContract {
  private client: IORedisClient | null = null
  private subscriber: IORedisClient | null = null
  private subscriptions = new Map<string, (message: string, channel: string) => void>()
  protected connected = false
  private ioredis: IORedisModule | null = null

  constructor(protected readonly config: RedisConfig = {}) {}

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establish TCP connection to Redis server.
   *
   * Dynamically loads ioredis library and initializes client with retry logic.
   * Connection is established lazily to allow configuration before network I/O.
   *
   * @returns Promise resolving when handshake completes.
   * @throws {Error} When ioredis package is not installed or connection fails.
   *
   * @example
   * ```typescript
   * const client = new RedisClient({ host: 'localhost', port: 6379 });
   * await client.connect();
   * ```
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
   * Gracefully terminate connection.
   *
   * Waits for pending commands to complete, closes Pub/Sub subscriber
   * if active, and releases socket resources. Safe to call multiple times.
   *
   * @returns Promise resolving when all resources are released.
   *
   * @example
   * ```typescript
   * await client.disconnect();
   * ```
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
   * Perform connection health check.
   *
   * Issues a PING command to verify network connectivity and server responsiveness.
   * Used for readiness probes in containerized deployments.
   *
   * @returns True if PING receives PONG response, false otherwise.
   *
   * @example
   * ```typescript
   * if (!(await client.checkHealth())) {
   *   console.error('Redis health check failed');
   * }
   * ```
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

  protected setClient(client: IORedisClient | null) {
    this.client = client
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.getClient().on(event, callback)
  }

  /**
   * Lazy-load ioredis dependency.
   *
   * Defers ioredis import until connection time to reduce startup overhead
   * and allow applications using Bun.redis exclusively to skip installing ioredis.
   *
   * @returns Loaded ioredis module with constructor.
   * @throws {Error} When ioredis package is not found in node_modules.
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
   * Access internal client with connection guard.
   *
   * Prevents command execution before connection establishment,
   * ensuring all operations occur on a valid socket.
   *
   * @returns Active ioredis client instance.
   * @throws {Error} When called before connect() completes.
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

  /**
   * Set the expiration time of a key.
   *
   * @param key - The key to expire.
   * @param seconds - The time in seconds.
   * @returns 1 if the timeout was set, 0 if key does not exist.
   *
   * @example
   * ```typescript
   * await redis.expire('session:123', 3600);
   * ```
   */
  async expire(key: string, seconds: number): Promise<number> {
    return await this.getClient().expire(key, seconds)
  }

  /**
   * Set the expiration time of a key as a UNIX timestamp.
   *
   * @param key - The key to expire.
   * @param timestamp - The UNIX timestamp in seconds.
   * @returns 1 if the timeout was set, 0 if key does not exist.
   *
   * @example
   * ```typescript
   * await redis.expireat('promo:end', 1735689600);
   * ```
   */
  async expireat(key: string, timestamp: number): Promise<number> {
    return await this.getClient().expireat(key, timestamp)
  }

  /**
   * Set the expiration time of a key in milliseconds.
   *
   * @param key - The key to expire.
   * @param milliseconds - The time in milliseconds.
   * @returns 1 if the timeout was set, 0 if key does not exist.
   *
   * @example
   * ```typescript
   * await redis.pexpire('cache:temp', 500);
   * ```
   */
  async pexpire(key: string, milliseconds: number): Promise<number> {
    return await this.getClient().pexpire(key, milliseconds)
  }

  /**
   * Get the remaining time to live of a key in seconds.
   *
   * @param key - The key to check.
   * @returns TTL in seconds, -1 if no TTL, -2 if key does not exist.
   *
   * @example
   * ```typescript
   * const ttl = await redis.ttl('session:123');
   * ```
   */
  async ttl(key: string): Promise<number> {
    return await this.getClient().ttl(key)
  }

  /**
   * Get the remaining time to live of a key in milliseconds.
   *
   * @param key - The key to check.
   * @returns TTL in milliseconds, -1 if no TTL, -2 if key does not exist.
   *
   * @example
   * ```typescript
   * const pttl = await redis.pttl('cache:temp');
   * ```
   */
  async pttl(key: string): Promise<number> {
    return await this.getClient().pttl(key)
  }

  /**
   * Remove the expiration from a key.
   *
   * @param key - The key to persist.
   * @returns 1 if timeout was removed, 0 if key does not exist or has no timeout.
   *
   * @example
   * ```typescript
   * await redis.persist('session:123');
   * ```
   */
  async persist(key: string): Promise<number> {
    return await this.getClient().persist(key)
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  /**
   * Get the value of a hash field.
   *
   * @param key - The hash key.
   * @param field - The field name.
   * @returns The value of the field, or null if not found.
   *
   * @example
   * ```typescript
   * const name = await redis.hget('user:1', 'name');
   * ```
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.getClient().hget(key, field)
  }

  /**
   * Set the value of one or more hash fields.
   *
   * @param key - The hash key.
   * @param fieldOrData - Field name or an object of field-value pairs.
   * @param value - The value to set (if fieldOrData is a string).
   * @returns The number of fields that were added.
   *
   * @example
   * ```typescript
   * // Single field
   * await redis.hset('user:1', 'name', 'John');
   * // Multiple fields
   * await redis.hset('user:1', { age: '30', city: 'New York' });
   * ```
   */
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

  /**
   * Delete one or more hash fields.
   *
   * @param key - The hash key.
   * @param fields - The fields to delete.
   * @returns The number of fields that were removed.
   *
   * @example
   * ```typescript
   * await redis.hdel('user:1', 'age', 'city');
   * ```
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.getClient().hdel(key, ...fields)
  }

  /**
   * Check if a hash field exists.
   *
   * @param key - The hash key.
   * @param field - The field name.
   * @returns 1 if field exists, 0 otherwise.
   *
   * @example
   * ```typescript
   * const exists = await redis.hexists('user:1', 'name');
   * ```
   */
  async hexists(key: string, field: string): Promise<number> {
    return await this.getClient().hexists(key, field)
  }

  /**
   * Get all fields and values in a hash.
   *
   * @param key - The hash key.
   * @returns An object containing all fields and values.
   *
   * @example
   * ```typescript
   * const user = await redis.hgetall('user:1');
   * ```
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.getClient().hgetall(key)
  }

  /**
   * Increment the integer value of a hash field by the given number.
   *
   * @param key - The hash key.
   * @param field - The field name.
   * @param increment - The amount to increment by.
   * @returns The new value of the field.
   *
   * @example
   * ```typescript
   * const newAge = await redis.hincrby('user:1', 'age', 1);
   * ```
   */
  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.getClient().hincrby(key, field, increment)
  }

  /**
   * Get all field names in a hash.
   *
   * @param key - The hash key.
   * @returns Array of field names.
   *
   * @example
   * ```typescript
   * const fields = await redis.hkeys('user:1');
   * ```
   */
  async hkeys(key: string): Promise<string[]> {
    return await this.getClient().hkeys(key)
  }

  /**
   * Get all values in a hash.
   *
   * @param key - The hash key.
   * @returns Array of values.
   *
   * @example
   * ```typescript
   * const values = await redis.hvals('user:1');
   * ```
   */
  async hvals(key: string): Promise<string[]> {
    return await this.getClient().hvals(key)
  }

  /**
   * Get the number of fields in a hash.
   *
   * @param key - The hash key.
   * @returns Number of fields.
   *
   * @example
   * ```typescript
   * const count = await redis.hlen('user:1');
   * ```
   */
  async hlen(key: string): Promise<number> {
    return await this.getClient().hlen(key)
  }

  /**
   * Get the values of all the given hash fields.
   *
   * @param key - The hash key.
   * @param fields - The fields to retrieve.
   * @returns Array of values (or nulls).
   *
   * @example
   * ```typescript
   * const [name, age] = await redis.hmget('user:1', 'name', 'age');
   * ```
   */
  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    return await this.getClient().hmget(key, ...fields)
  }

  /**
   * Set multiple hash fields to multiple values.
   *
   * @param key - The hash key.
   * @param data - An object of field-value pairs.
   * @returns 'OK'.
   *
   * @example
   * ```typescript
   * await redis.hmset('user:1', { name: 'John', age: '30' });
   * ```
   */
  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    const args = Object.entries(data).flat()
    return await this.getClient().hmset(key, ...args)
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  /**
   * Prepend one or multiple values to a list.
   *
   * @param key - The list key.
   * @param values - The values to prepend.
   * @returns The length of the list after the push operation.
   *
   * @example
   * ```typescript
   * await redis.lpush('tasks', 'task1', 'task2');
   * ```
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.getClient().lpush(key, ...values)
  }

  /**
   * Append one or multiple values to a list.
   *
   * @param key - The list key.
   * @param values - The values to append.
   * @returns The length of the list after the push operation.
   *
   * @example
   * ```typescript
   * await redis.rpush('tasks', 'task3');
   * ```
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    return await this.getClient().rpush(key, ...values)
  }

  /**
   * Remove and get the first element in a list.
   *
   * @param key - The list key.
   * @returns The value of the first element, or null if list is empty.
   *
   * @example
   * ```typescript
   * const task = await redis.lpop('tasks');
   * ```
   */
  async lpop(key: string): Promise<string | null> {
    return await this.getClient().lpop(key)
  }

  /**
   * Remove and get the last element in a list.
   *
   * @param key - The list key.
   * @returns The value of the last element, or null if list is empty.
   *
   * @example
   * ```typescript
   * const task = await redis.rpop('tasks');
   * ```
   */
  async rpop(key: string): Promise<string | null> {
    return await this.getClient().rpop(key)
  }

  /**
   * Get a range of elements from a list.
   *
   * @param key - The list key.
   * @param start - Start index (0-based).
   * @param stop - Stop index (inclusive).
   * @returns Array of elements in the specified range.
   *
   * @example
   * ```typescript
   * const tasks = await redis.lrange('tasks', 0, -1); // Get all
   * ```
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.getClient().lrange(key, start, stop)
  }

  /**
   * Get the length of a list.
   *
   * @param key - The list key.
   * @returns The length of the list.
   *
   * @example
   * ```typescript
   * const count = await redis.llen('tasks');
   * ```
   */
  async llen(key: string): Promise<number> {
    return await this.getClient().llen(key)
  }

  /**
   * Get an element from a list by its index.
   *
   * @param key - The list key.
   * @param index - The index (0-based).
   * @returns The value of the element, or null if index is out of range.
   *
   * @example
   * ```typescript
   * const task = await redis.lindex('tasks', 0);
   * ```
   */
  async lindex(key: string, index: number): Promise<string | null> {
    return await this.getClient().lindex(key, index)
  }

  /**
   * Set the value of an element in a list by its index.
   *
   * @param key - The list key.
   * @param index - The index (0-based).
   * @param value - The new value.
   * @returns 'OK'.
   *
   * @example
   * ```typescript
   * await redis.lset('tasks', 0, 'updated-task');
   * ```
   */
  async lset(key: string, index: number, value: string): Promise<'OK'> {
    return await this.getClient().lset(key, index, value)
  }

  /**
   * Remove elements from a list.
   *
   * @param key - The list key.
   * @param count - Number of occurrences to remove (positive: from head, negative: from tail, 0: all).
   * @param value - The value to remove.
   * @returns The number of removed elements.
   *
   * @example
   * ```typescript
   * await redis.lrem('tasks', 1, 'task1');
   * ```
   */
  async lrem(key: string, count: number, value: string): Promise<number> {
    return await this.getClient().lrem(key, count, value)
  }

  /**
   * Trim a list to the specified range.
   *
   * @param key - The list key.
   * @param start - Start index.
   * @param stop - Stop index.
   * @returns 'OK'.
   *
   * @example
   * ```typescript
   * await redis.ltrim('tasks', 0, 99); // Keep only first 100
   * ```
   */
  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    return await this.getClient().ltrim(key, start, stop)
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  /**
   * Add one or more members to a set.
   *
   * @param key - The set key.
   * @param members - The members to add.
   * @returns The number of members that were added.
   *
   * @example
   * ```typescript
   * await redis.sadd('tags', 'news', 'tech');
   * ```
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().sadd(key, ...members)
  }

  /**
   * Remove one or more members from a set.
   *
   * @param key - The set key.
   * @param members - The members to remove.
   * @returns The number of members that were removed.
   *
   * @example
   * ```typescript
   * await redis.srem('tags', 'news');
   * ```
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().srem(key, ...members)
  }

  /**
   * Get all the members in a set.
   *
   * @param key - The set key.
   * @returns Array of members.
   *
   * @example
   * ```typescript
   * const tags = await redis.smembers('tags');
   * ```
   */
  async smembers(key: string): Promise<string[]> {
    return await this.getClient().smembers(key)
  }

  /**
   * Determine if a given value is a member of a set.
   *
   * @param key - The set key.
   * @param member - The member to check.
   * @returns 1 if member exists, 0 otherwise.
   *
   * @example
   * ```typescript
   * const isMember = await redis.sismember('tags', 'news');
   * ```
   */
  async sismember(key: string, member: string): Promise<number> {
    return await this.getClient().sismember(key, member)
  }

  /**
   * Get the number of members in a set.
   *
   * @param key - The set key.
   * @returns The cardinality (number of elements) of the set.
   *
   * @example
   * ```typescript
   * const count = await redis.scard('tags');
   * ```
   */
  async scard(key: string): Promise<number> {
    return await this.getClient().scard(key)
  }

  /**
   * Remove and return one or multiple random members from a set.
   *
   * @param key - The set key.
   * @param count - Number of members to pop.
   * @returns The popped member(s), or null if set is empty.
   *
   * @example
   * ```typescript
   * const tag = await redis.spop('tags');
   * ```
   */
  async spop(key: string, count?: number): Promise<string | string[] | null> {
    if (count !== undefined) {
      return await this.getClient().spop(key, count)
    }
    return await this.getClient().spop(key)
  }

  /**
   * Get one or multiple random members from a set.
   *
   * @param key - The set key.
   * @param count - Number of members to return.
   * @returns The random member(s), or null if set is empty.
   *
   * @example
   * ```typescript
   * const tag = await redis.srandmember('tags');
   * ```
   */
  async srandmember(key: string, count?: number): Promise<string | string[] | null> {
    if (count !== undefined) {
      return await this.getClient().srandmember(key, count)
    }
    return await this.getClient().srandmember(key)
  }

  /**
   * Add multiple sets and return the resulting set.
   *
   * @param keys - The set keys.
   * @returns Array of members in the union.
   *
   * @example
   * ```typescript
   * const allTags = await redis.sunion('tags1', 'tags2');
   * ```
   */
  async sunion(...keys: string[]): Promise<string[]> {
    return await this.getClient().sunion(...keys)
  }

  /**
   * Intersect multiple sets and return the resulting set.
   *
   * @param keys - The set keys.
   * @returns Array of members in the intersection.
   *
   * @example
   * ```typescript
   * const commonTags = await redis.sinter('tags1', 'tags2');
   * ```
   */
  async sinter(...keys: string[]): Promise<string[]> {
    return await this.getClient().sinter(...keys)
  }

  /**
   * Subtract multiple sets and return the resulting set.
   *
   * @param keys - The set keys.
   * @returns Array of members in the difference.
   *
   * @example
   * ```typescript
   * const diffTags = await redis.sdiff('tags1', 'tags2');
   * ```
   */
  async sdiff(...keys: string[]): Promise<string[]> {
    return await this.getClient().sdiff(...keys)
  }

  // ============================================================================
  // Sorted Set Operations
  // ============================================================================

  /**
   * Add one or more members to a sorted set, or update its score if it already exists.
   *
   * @param key - The sorted set key.
   * @param items - Array of score-member pairs.
   * @returns The number of elements added.
   *
   * @example
   * ```typescript
   * await redis.zadd('ranks', { score: 10, member: 'alice' }, { score: 20, member: 'bob' });
   * ```
   */
  async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    const args: (string | number)[] = []
    for (const item of items) {
      args.push(item.score, item.member)
    }
    return await this.getClient().zadd(key, ...args)
  }

  /**
   * Remove one or more members from a sorted set.
   *
   * @param key - The sorted set key.
   * @param members - The members to remove.
   * @returns The number of members removed.
   *
   * @example
   * ```typescript
   * await redis.zrem('ranks', 'alice');
   * ```
   */
  async zrem(key: string, ...members: string[]): Promise<number> {
    return await this.getClient().zrem(key, ...members)
  }

  /**
   * Get the score associated with the given member in a sorted set.
   *
   * @param key - The sorted set key.
   * @param member - The member name.
   * @returns The score as a string, or null if member not found.
   *
   * @example
   * ```typescript
   * const score = await redis.zscore('ranks', 'bob');
   * ```
   */
  async zscore(key: string, member: string): Promise<string | null> {
    return await this.getClient().zscore(key, member)
  }

  /**
   * Determine the index of a member in a sorted set, with scores ordered from low to high.
   *
   * @param key - The sorted set key.
   * @param member - The member name.
   * @returns The rank (0-based), or null if member not found.
   *
   * @example
   * ```typescript
   * const rank = await redis.zrank('ranks', 'alice');
   * ```
   */
  async zrank(key: string, member: string): Promise<number | null> {
    return await this.getClient().zrank(key, member)
  }

  /**
   * Determine the index of a member in a sorted set, with scores ordered from high to low.
   *
   * @param key - The sorted set key.
   * @param member - The member name.
   * @returns The rank (0-based), or null if member not found.
   *
   * @example
   * ```typescript
   * const rank = await redis.zrevrank('ranks', 'bob');
   * ```
   */
  async zrevrank(key: string, member: string): Promise<number | null> {
    return await this.getClient().zrevrank(key, member)
  }

  /**
   * Return a range of members in a sorted set, by index.
   *
   * @param key - The sorted set key.
   * @param start - Start index.
   * @param stop - Stop index.
   * @param options - Optional arguments (e.g., withScores).
   * @returns Array of members (and optionally scores).
   *
   * @example
   * ```typescript
   * const top3 = await redis.zrange('ranks', 0, 2);
   * ```
   */
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

  /**
   * Return a range of members in a sorted set, by index, with scores ordered from high to low.
   *
   * @param key - The sorted set key.
   * @param start - Start index.
   * @param stop - Stop index.
   * @param options - Optional arguments (e.g., withScores).
   * @returns Array of members (and optionally scores).
   *
   * @example
   * ```typescript
   * const top3 = await redis.zrevrange('ranks', 0, 2);
   * ```
   */
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

  /**
   * Get the number of members in a sorted set.
   *
   * @param key - The sorted set key.
   * @returns The cardinality of the sorted set.
   *
   * @example
   * ```typescript
   * const count = await redis.zcard('ranks');
   * ```
   */
  async zcard(key: string): Promise<number> {
    return await this.getClient().zcard(key)
  }

  /**
   * Count the members in a sorted set with scores within the given values.
   *
   * @param key - The sorted set key.
   * @param min - Minimum score.
   * @param max - Maximum score.
   * @returns The number of members in the specified score range.
   *
   * @example
   * ```typescript
   * const count = await redis.zcount('ranks', 10, 50);
   * ```
   */
  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    return await this.getClient().zcount(key, min, max)
  }

  /**
   * Increment the score of a member in a sorted set.
   *
   * @param key - The sorted set key.
   * @param increment - The amount to increment by.
   * @param member - The member name.
   * @returns The new score as a string.
   *
   * @example
   * ```typescript
   * const newScore = await redis.zincrby('ranks', 5, 'alice');
   * ```
   */
  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return await this.getClient().zincrby(key, increment, member)
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  /**
   * Find all keys matching the given pattern.
   *
   * @param pattern - The glob-style pattern.
   * @returns Array of matching keys.
   *
   * @example
   * ```typescript
   * const keys = await redis.keys('user:*');
   * ```
   */
  async keys(pattern: string): Promise<string[]> {
    return await this.getClient().keys(pattern)
  }

  /**
   * Incrementally iterate the keys space.
   *
   * @param cursor - The cursor (0 to start).
   * @param options - Optional arguments (MATCH, COUNT).
   * @returns An object containing the next cursor and the keys found.
   *
   * @example
   * ```typescript
   * const { cursor, keys } = await redis.scan('0', { match: 'user:*', count: 10 });
   * ```
   */
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

  /**
   * Determine the type stored at key.
   *
   * @param key - The key to check.
   * @returns The type (string, list, set, zset, hash, stream).
   *
   * @example
   * ```typescript
   * const type = await redis.type('user:1');
   * ```
   */
  async type(key: string): Promise<string> {
    return await this.getClient().type(key)
  }

  /**
   * Rename a key.
   *
   * @param key - The existing key.
   * @param newKey - The new key name.
   * @returns 'OK'.
   *
   * @example
   * ```typescript
   * await redis.rename('old-key', 'new-key');
   * ```
   */
  async rename(key: string, newKey: string): Promise<'OK'> {
    return await this.getClient().rename(key, newKey)
  }

  /**
   * Rename a key, only if the new key does not exist.
   *
   * @param key - The existing key.
   * @param newKey - The new key name.
   * @returns 1 if renamed, 0 if newKey already exists.
   *
   * @example
   * ```typescript
   * await redis.renamenx('old-key', 'new-key');
   * ```
   */
  async renamenx(key: string, newKey: string): Promise<number> {
    return await this.getClient().renamenx(key, newKey)
  }

  // ============================================================================
  // Server Operations
  // ============================================================================

  /**
   * Remove all keys from the current database.
   *
   * @returns 'OK'.
   */
  async flushdb(): Promise<'OK'> {
    return await this.getClient().flushdb()
  }

  /**
   * Remove all keys from all databases.
   *
   * @returns 'OK'.
   */
  async flushall(): Promise<'OK'> {
    return await this.getClient().flushall()
  }

  /**
   * Return the number of keys in the selected database.
   *
   * @returns Number of keys.
   */
  async dbsize(): Promise<number> {
    return await this.getClient().dbsize()
  }

  /**
   * Get information and statistics about the server.
   *
   * @param section - Optional section name.
   * @returns Server information string.
   */
  async info(section?: string): Promise<string> {
    if (section) {
      return await this.getClient().info(section)
    }
    return await this.getClient().info()
  }

  // ============================================================================
  // Pub/Sub
  // ============================================================================

  /**
   * Post a message to a channel.
   *
   * @param channel - The channel name.
   * @param message - The message to publish.
   * @returns The number of subscribers that received the message.
   *
   * @example
   * ```typescript
   * await redis.publish('events', 'Hello Galaxy!');
   * ```
   */
  async publish(channel: string, message: string): Promise<number> {
    return await this.getClient().publish(channel, message)
  }

  /**
   * Subscribe to a channel.
   *
   * @param channel - The channel name.
   * @param callback - The callback function.
   * @returns A promise resolving when subscribed.
   *
   * @example
   * ```typescript
   * await redis.subscribe('events', (msg) => console.log(msg));
   * ```
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

  /**
   * Unsubscribe from a channel.
   *
   * @param channel - The channel name.
   * @returns A promise resolving when unsubscribed.
   *
   * @example
   * ```typescript
   * await redis.unsubscribe('events');
   * ```
   */
  async unsubscribe(channel: string): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel)
      this.subscriptions.delete(channel)
    }
  }

  // ============================================================================
  // Pipeline
  // ============================================================================

  /**
   * Create a new pipeline for batching commands.
   *
   * @returns A new RedisPipeline instance.
   *
   * @example
   * ```typescript
   * const [val1, val2] = await redis.pipeline()
   *   .get('key1')
   *   .get('key2')
   *   .exec();
   * ```
   */
  pipeline(): RedisPipelineContract {
    return new RedisPipeline(this.getClient().pipeline())
  }

  /**
   * Execute a Lua script server-side.
   *
   * @param script - The Lua script.
   * @param numKeys - Number of keys.
   * @param args - Keys and arguments.
   * @returns The script result.
   *
   * @example
   * ```typescript
   * const result = await redis.eval('return redis.call("GET", KEYS[1])', 1, 'key');
   * ```
   */
  async eval(script: string, numKeys: number, ...args: string[]): Promise<unknown> {
    return await this.getClient().eval(script, numKeys, ...args)
  }

  /**
   * Execute a Lua script server-side by its SHA1 digest.
   *
   * @param sha1 - The SHA1 digest of the script.
   * @param numKeys - Number of keys.
   * @param args - Keys and arguments.
   * @returns The script result.
   *
   * @example
   * ```typescript
   * const result = await redis.evalsha('bfbf45...', 1, 'key');
   * ```
   */
  async evalsha(sha1: string, numKeys: number, ...args: string[]): Promise<unknown> {
    return await this.getClient().evalsha(sha1, numKeys, ...args)
  }

  // ============================================================================
  // Stream Operations
  // ============================================================================

  /**
   * Append a new entry to a stream.
   *
   * @param key - The stream key.
   * @param data - An object of field-value pairs.
   * @param options - Optional arguments (MAXLEN, ID, etc.).
   * @returns The ID of the added entry.
   *
   * @example
   * ```typescript
   * const id = await redis.xadd('mystream', { sensor: 'temp', value: '25.5' }, { maxlen: 1000 });
   * ```
   */
  async xadd(
    key: string,
    data: Record<string, string>,
    options?: import('./types').XAddOptions
  ): Promise<string> {
    const args: unknown[] = [key]

    if (options?.maxlen) {
      args.push('MAXLEN')
      if (options.approximate) {
        args.push('~')
      }
      args.push(options.maxlen)
    }

    if (options?.id) {
      args.push(options.id)
    } else {
      args.push('*')
    }

    // ioredis needs fields as separate arguments or as a map?
    // ioredis xadd signature: xadd(key, id, field, value, ...) or xadd(key, 'MAXLEN', '~', 1000, '*', field, value)
    // Actually ioredis supports key, MAXLEN, ~, 1000, ID, field, value...
    // Let's use call() to be safe and consistent with our manual args building

    for (const [field, value] of Object.entries(data)) {
      args.push(field, value)
    }

    return (await (this.getClient() as IORedisClientWithCall).call('XADD', ...args)) as string
  }

  /**
   * Read data from one or multiple streams.
   *
   * @param streams - An object of stream keys and their last IDs.
   * @param options - Optional arguments (COUNT, BLOCK).
   * @returns The stream data, or null if no data found.
   *
   * @example
   * ```typescript
   * const results = await redis.xread({ mystream: '0' }, { count: 10 });
   * ```
   */
  async xread(
    streams: Record<string, string>,
    options?: import('./types').XReadOptions
  ): Promise<import('./types').StreamReadResult | null> {
    const args: unknown[] = []

    if (options?.count) {
      args.push('COUNT', options.count)
    }
    if (options?.block) {
      args.push('BLOCK', options.block)
    }

    args.push('STREAMS')
    const keys = Object.keys(streams)
    const ids = Object.values(streams)
    args.push(...keys, ...ids)

    return (await (this.getClient() as IORedisClientWithCall).call('XREAD', ...args)) as
      | import('./types').StreamReadResult
      | null
  }

  /**
   * Read data from one or multiple streams as a consumer group.
   *
   * @param group - The consumer group name.
   * @param consumer - The consumer name.
   * @param streams - An object of stream keys and their last IDs.
   * @param options - Optional arguments (COUNT, BLOCK).
   * @returns The stream data, or null if no data found.
   *
   * @example
   * ```typescript
   * const results = await redis.xreadgroup('workers', 'consumer-1', { mystream: '>' });
   * ```
   */
  async xreadgroup(
    group: string,
    consumer: string,
    streams: Record<string, string>,
    options?: import('./types').XReadOptions
  ): Promise<import('./types').StreamReadResult | null> {
    const args: unknown[] = ['GROUP', group, consumer]

    if (options?.count) {
      args.push('COUNT', options.count)
    }
    if (options?.block) {
      args.push('BLOCK', options.block)
    }

    args.push('STREAMS')
    const keys = Object.keys(streams)
    const ids = Object.values(streams)
    args.push(...keys, ...ids)

    return (await (this.getClient() as IORedisClientWithCall).call('XREADGROUP', ...args)) as
      | import('./types').StreamReadResult
      | null
  }

  /**
   * Manage consumer groups.
   *
   * @param command - The XGROUP subcommand (CREATE, DESTROY, etc.).
   * @param key - The stream key.
   * @param group - The group name.
   * @param args - Additional arguments.
   * @returns Command result.
   *
   * @example
   * ```typescript
   * await redis.xgroup('CREATE', 'mystream', 'workers', '$', true);
   * ```
   */
  async xgroup(
    command: 'CREATE' | 'DESTROY' | 'DELCONSUMER' | 'SETID',
    key: string,
    group: string,
    ...args: (string | boolean | undefined)[]
  ): Promise<any> {
    const cmdArgs: unknown[] = [command, key, group]

    if (command === 'CREATE') {
      const id = args[0] || '$'
      const mkstream = args[1]
      cmdArgs.push(id)
      if (mkstream) {
        cmdArgs.push('MKSTREAM')
      }
    } else if (command === 'DELCONSUMER') {
      cmdArgs.push(args[0])
    } else if (command === 'SETID') {
      cmdArgs.push(args[0])
    }

    return await (this.getClient() as IORedisClientWithCall).call('XGROUP', ...cmdArgs)
  }

  /**
   * Acknowledge one or multiple messages in a consumer group.
   *
   * @param key - The stream key.
   * @param group - The group name.
   * @param ids - The message IDs to acknowledge.
   * @returns The number of messages acknowledged.
   *
   * @example
   * ```typescript
   * await redis.xack('mystream', 'workers', '1526569495631-0');
   * ```
   */
  async xack(key: string, group: string, ...ids: string[]): Promise<number> {
    return (await (this.getClient() as IORedisClientWithCall).call(
      'XACK',
      key,
      group,
      ...ids
    )) as number
  }

  /**
   * Get the length of a stream.
   *
   * @param key - The stream key.
   * @returns The number of entries in the stream.
   *
   * @example
   * ```typescript
   * const count = await redis.xlen('mystream');
   * ```
   */
  async xlen(key: string): Promise<number> {
    return await this.getClient().xlen(key)
  }

  /**
   * Return a range of entries from a stream.
   *
   * @param key - The stream key.
   * @param start - Start ID.
   * @param end - End ID.
   * @param count - Maximum number of entries to return.
   * @returns Array of stream entries.
   *
   * @example
   * ```typescript
   * const entries = await redis.xrange('mystream', '-', '+', 10);
   * ```
   */
  async xrange(
    key: string,
    start: string,
    end: string,
    count?: number
  ): Promise<import('./types').StreamEntry[]> {
    if (count) {
      return (await this.getClient().xrange(key, start, end, 'COUNT', count)) as any
    }
    return (await this.getClient().xrange(key, start, end)) as any
  }

  /**
   * Return a range of entries from a stream in reverse order.
   *
   * @param key - The stream key.
   * @param end - End ID.
   * @param start - Start ID.
   * @param count - Maximum number of entries to return.
   * @returns Array of stream entries.
   *
   * @example
   * ```typescript
   * const entries = await redis.xrevrange('mystream', '+', '-', 10);
   * ```
   */
  async xrevrange(
    key: string,
    end: string,
    start: string,
    count?: number
  ): Promise<import('./types').StreamEntry[]> {
    if (count) {
      return (await this.getClient().xrevrange(key, end, start, 'COUNT', count)) as any
    }
    return (await this.getClient().xrevrange(key, end, start)) as any
  }

  /**
   * Trim a stream to a maximum number of entries.
   *
   * @param key - The stream key.
   * @param maxlen - Maximum length.
   * @param approximate - Whether to use approximate trimming (~).
   * @returns The number of entries deleted.
   *
   * @example
   * ```typescript
   * await redis.xtrim('mystream', 1000, true);
   * ```
   */
  async xtrim(key: string, maxlen: number, approximate?: boolean): Promise<number> {
    const args: unknown[] = ['MAXLEN']
    if (approximate) {
      args.push('~')
    }
    args.push(maxlen)
    return (await this.getClient().xtrim(key, ...args)) as number
  }

  /**
   * Delete one or multiple entries from a stream.
   *
   * @param key - The stream key.
   * @param ids - The entry IDs to delete.
   * @returns The number of entries deleted.
   *
   * @example
   * ```typescript
   * await redis.xdel('mystream', '1526569495631-0');
   * ```
   */
  async xdel(key: string, ...ids: string[]): Promise<number> {
    return await this.getClient().xdel(key, ...ids)
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
