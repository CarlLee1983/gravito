/**
 * @gravito/plasma - Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Redis client implementation type
 */
export type RedisClientType = 'bun' | 'ioredis' | 'auto'

/**
 * Configuration for a single Redis node (standalone or cluster).
 * Used for both basic connection settings and as a seed node for cluster discovery.
 *
 * @public
 * @example
 * ```typescript
 * const node: RedisNode = {
 *   host: '127.0.0.1',
 *   port: 6379,
 *   password: 'your-password'
 * };
 * ```
 */
export interface RedisNode {
  /** The hostname or IP address of the Redis server */
  host?: string
  /** The port number of the Redis server (default: 6379) */
  port?: number
  /** Authentication password for the Redis server */
  password?: string
  /** Database index to use (0-15, not supported in Cluster mode) */
  db?: number
}

/**
 * Cluster configuration options for Redis Cluster environments.
 * Requires 'ioredis' client type.
 *
 * @public
 * @example
 * ```typescript
 * const cluster: ClusterOptions = {
 *   enable: true,
 *   nodes: [
 *     { host: '10.0.0.1', port: 7000 },
 *     { host: '10.0.0.2', port: 7000 }
 *   ],
 *   scaleReads: 'slave'
 * };
 * ```
 */
export interface ClusterOptions {
  /**
   * List of cluster nodes to connect to.
   * If 'enable' is true but 'nodes' is empty, the main host/port will be used as a seed.
   */
  nodes?: RedisNode[]
  /** Whether to enable Redis Cluster mode */
  enable?: boolean
  /**
   * Strategy for scaling read operations across the cluster.
   * - 'master': Only read from master nodes (default)
   * - 'slave': Only read from slave nodes
   * - 'all': Read from both master and slave nodes
   */
  scaleReads?: 'master' | 'slave' | 'all'
  /**
   * Advanced Redis Cluster specific options passed directly to the underlying ioredis client.
   * @see https://github.com/luin/ioredis/blob/master/API.md#new-clusterstartupnodes-options
   */
  redisOptions?: Record<string, any>
}

/**
 * Detailed configuration for a single Redis connection.
 * @public
 */
export interface RedisConfig extends RedisNode {
  /** Initial connection timeout in milliseconds */
  connectTimeout?: number
  /** Individual command execution timeout in milliseconds */
  commandTimeout?: number
  /** Security settings for TLS/SSL connections */
  tls?: boolean | TLSOptions
  /** Optional string to prepend to all keys for namespacing */
  keyPrefix?: string
  /** Maximum number of reconnection attempts before failing */
  maxRetries?: number
  /** Milliseconds to wait between reconnection attempts */
  retryDelay?: number
  /** Client implementation type: 'bun' (Bun.redis), 'ioredis', or 'auto' (default: 'auto') */
  clientType?: RedisClientType
  /** Cluster configuration */
  cluster?: ClusterOptions
}

/**
 * TLS configuration options for secure Redis connections.
 * @public
 */
export interface TLSOptions {
  /** If false, the server certificate is not verified */
  rejectUnauthorized?: boolean
  /** Path to the CA certificate string */
  ca?: string
  /** Path to the client certificate string */
  cert?: string
  /** Path to the client private key string */
  key?: string
}

/**
 * Configuration for the Redis Manager, supporting multiple named connections.
 * @public
 */
export interface RedisManagerConfig {
  /** The name of the connection to use by default */
  default?: string
  /** A map of connection names to their respective configurations */
  connections: Record<string, RedisConfig>
}

// ============================================================================
// Command Options
// ============================================================================

/**
 * Options for the SET command, including expiration and conditional logic.
 * @public
 */
export interface SetOptions {
  /** Expiration time in seconds (EX) */
  ex?: number
  /** Expiration time in milliseconds (PX) */
  px?: number
  /** Only set the key if it already exists (XX) */
  xx?: boolean
  /** Only set the key if it does not already exist (NX) */
  nx?: boolean
  /** Retain the existing Time-To-Live associated with the key */
  keepttl?: boolean
}

/**
 * Member and score pair for Sorted Set operations.
 * @public
 */
export interface ZAddOptions {
  /** Numerical score for sorting */
  score: number
  /** The value/member string */
  member: string
}

/**
 * Options for ZRANGE and related Sorted Set queries.
 * @public
 */
export interface ZRangeOptions {
  /** Return results in reverse (descending) order */
  rev?: boolean
  /** Return members along with their numerical scores */
  withScores?: boolean
}

/**
 * Options for the SCAN family of commands.
 * @public
 */
export interface ScanOptions {
  /** Glob-style pattern to filter keys */
  match?: string
  /** Approximate number of elements to return in each iteration */
  count?: number
}

/**
 * Options for the XADD command to append entries to a stream.
 *
 * @public
 * @example
 * ```typescript
 * const options: XAddOptions = {
 *   maxlen: 1000,
 *   approximate: true,
 *   id: '*'
 * };
 * ```
 */
export interface XAddOptions {
  /**
   * Maximum length of the stream (MAXLEN).
   * When specified, the stream is truncated to this length.
   */
  maxlen?: number
  /**
   * Whether to use approximate matching for MAXLEN (~).
   * This is more efficient as it doesn't require exact truncation.
   */
  approximate?: boolean
  /**
   * The stream ID to use.
   * Use '*' to let Redis auto-generate a unique ID based on the current time.
   */
  id?: string
}

/**
 * Options for XREAD and XREADGROUP commands to retrieve data from streams.
 *
 * @public
 * @example
 * ```typescript
 * const options: XReadOptions = {
 *   count: 10,
 *   block: 2000
 * };
 * ```
 */
export interface XReadOptions {
  /**
   * Maximum number of elements to return per stream (COUNT).
   */
  count?: number
  /**
   * Time in milliseconds to block the connection if no data is available (BLOCK).
   * Use 0 to block indefinitely.
   */
  block?: number
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Represents a single entry in a Redis Stream.
 * A tuple consisting of the entry ID and an array of field-value pairs.
 *
 * @public
 * @example
 * ```typescript
 * const entry: StreamEntry = ['1626535435629-0', ['sensor', 'temp', 'value', '25.5']];
 * ```
 */
export type StreamEntry = [id: string, fields: string[]]

/**
 * Represents the result of an XREAD or XREADGROUP operation.
 * An array of stream results, where each result is a tuple of the stream key and its entries.
 *
 * @public
 * @example
 * ```typescript
 * const result: StreamReadResult = [
 *   ['mystream', [
 *     ['1626535435629-0', ['field1', 'value1']]
 *   ]]
 * ];
 * ```
 */
export type StreamReadResult = [stream: string, entries: StreamEntry[]][]

/**
 * Represents the result of a single SCAN iteration.
 * @public
 */
export interface ScanResult {
  /** The cursor to be used in the next SCAN call (0 means finished) */
  cursor: string
  /** The batch of keys found in the current iteration */
  keys: string[]
}

/**
 * Represents the results of a pipeline execution.
 * Each element is a tuple of [Error | null, result].
 * @public
 */
export type PipelineResult = [error: Error | null, result: unknown][]

// ============================================================================
// Contract Interfaces
// ============================================================================

/**
 * The standard interface for a Redis client in the Gravito ecosystem.
 * Provides a fluent, Laravel-inspired API for common Redis operations.
 * @public
 */
export interface RedisClientContract {
  /** Establishes a connection to the Redis server */
  connect(): Promise<void>
  /** Closes the active connection */
  disconnect(): Promise<void>
  /** Returns true if the client is currently connected */
  isConnected(): boolean
  /** Sends a PING command to test the connection */
  ping(): Promise<string>
  on(event: string, callback: (...args: any[]) => void): void

  /**
   * Health check
   * Checks if connection is alive and responsive
   */
  checkHealth(): Promise<boolean>

  /** Retrieves the value of a key */
  get(key: string): Promise<string | null>
  /** Sets the value of a key with optional expiration/conditions */
  set(key: string, value: string, options?: SetOptions): Promise<'OK' | null>
  /** Removes one or more keys */
  del(...keys: string[]): Promise<number>
  /** Returns the count of existing keys among the arguments */
  exists(...keys: string[]): Promise<number>
  /** Increments a numerical key by 1 */
  incr(key: string): Promise<number>
  /** Increments a numerical key by a specific amount */
  incrby(key: string, increment: number): Promise<number>
  /** Decrements a numerical key by 1 */
  decr(key: string): Promise<number>
  /** Decrements a numerical key by a specific amount */
  decrby(key: string, decrement: number): Promise<number>
  /** Appends a string to a key's existing value */
  append(key: string, value: string): Promise<number>
  /** Returns the length of a string key */
  strlen(key: string): Promise<number>
  /** Sets a value and returns the old value as an atomic operation */
  getset(key: string, value: string): Promise<string | null>
  /** Retrieves multiple key values in a single call */
  mget(...keys: string[]): Promise<(string | null)[]>
  /** Sets multiple key-value pairs in a single call */
  mset(pairs: Record<string, string>): Promise<'OK'>

  /** Sets a timeout (in seconds) on a key */
  expire(key: string, seconds: number): Promise<number>
  /** Sets an absolute expiration timestamp (Unix seconds) on a key */
  expireat(key: string, timestamp: number): Promise<number>
  /** Sets a timeout (in milliseconds) on a key */
  pexpire(key: string, milliseconds: number): Promise<number>
  /** Returns the remaining time to live in seconds */
  ttl(key: string): Promise<number>
  /** Returns the remaining time to live in milliseconds */
  pttl(key: string): Promise<number>
  /** Removes any existing expiration from a key */
  persist(key: string): Promise<number>

  /** Retrieves a value from a hash field */
  hget(key: string, field: string): Promise<string | null>
  /** Sets a single field or multiple fields in a hash */
  hset(key: string, fieldOrData: string | Record<string, string>, value?: string): Promise<number>
  /** Removes one or more fields from a hash */
  hdel(key: string, ...fields: string[]): Promise<number>
  /** Returns if a field exists in a hash */
  hexists(key: string, field: string): Promise<number>
  /** Retrieves all fields and values of a hash */
  hgetall(key: string): Promise<Record<string, string>>
  /** Increments a numerical hash field by a specific amount */
  hincrby(key: string, field: string, increment: number): Promise<number>
  /** Returns all field names in a hash */
  hkeys(key: string): Promise<string[]>
  /** Returns all values in a hash */
  hvals(key: string): Promise<string[]>
  /** Returns the number of fields in a hash */
  hlen(key: string): Promise<number>
  /** Retrieves multiple hash fields in a single call */
  hmget(key: string, ...fields: string[]): Promise<(string | null)[]>
  /** Sets multiple hash fields (Legacy alias for hset) */
  hmset(key: string, data: Record<string, string>): Promise<'OK'>

  /** Prepends one or more values to a list */
  lpush(key: string, ...values: string[]): Promise<number>
  /** Appends one or more values to a list */
  rpush(key: string, ...values: string[]): Promise<number>
  /** Removes and returns the first element of a list */
  lpop(key: string): Promise<string | null>
  /** Removes and returns the last element of a list */
  rpop(key: string): Promise<string | null>
  /** Returns a range of elements from a list */
  lrange(key: string, start: number, stop: number): Promise<string[]>
  /** Returns the size of a list */
  llen(key: string): Promise<number>
  /** Returns an element by its index in a list */
  lindex(key: string, index: number): Promise<string | null>
  /** Sets an element value at a specific list index */
  lset(key: string, index: number, value: string): Promise<'OK'>
  /** Removes elements from a list matching a value */
  lrem(key: string, count: number, value: string): Promise<number>
  /** Truncates a list to a specific range */
  ltrim(key: string, start: number, stop: number): Promise<'OK'>

  /** Adds one or more members to a set */
  sadd(key: string, ...members: string[]): Promise<number>
  /** Removes one or more members from a set */
  srem(key: string, ...members: string[]): Promise<number>
  /** Returns all members of a set */
  smembers(key: string): Promise<string[]>
  /** Checks if a member exists in a set */
  sismember(key: string, member: string): Promise<number>
  /** Returns the cardinality (count) of a set */
  scard(key: string): Promise<number>
  /** Removes and returns random members from a set */
  spop(key: string, count?: number): Promise<string | string[] | null>
  /** Returns random members from a set without removing them */
  srandmember(key: string, count?: number): Promise<string | string[] | null>
  /** Returns the union of multiple sets */
  sunion(...keys: string[]): Promise<string[]>
  /** Returns the intersection of multiple sets */
  sinter(...keys: string[]): Promise<string[]>
  /** Returns the difference between the first set and subsequent sets */
  sdiff(...keys: string[]): Promise<string[]>

  /** Adds one or more members to a sorted set with scores */
  zadd(key: string, ...items: ZAddOptions[]): Promise<number>
  /** Removes one or more members from a sorted set */
  zrem(key: string, ...members: string[]): Promise<number>
  /** Returns the score of a member in a sorted set */
  zscore(key: string, member: string): Promise<string | null>
  /** Returns the rank (ascending) of a member in a sorted set */
  zrank(key: string, member: string): Promise<number | null>
  /** Returns the rank (descending) of a member in a sorted set */
  zrevrank(key: string, member: string): Promise<number | null>
  /** Returns a range of members from a sorted set */
  zrange(key: string, start: number, stop: number, options?: ZRangeOptions): Promise<string[]>
  /** Returns a range of members from a sorted set in reverse order */
  zrevrange(key: string, start: number, stop: number, options?: ZRangeOptions): Promise<string[]>
  /** Returns the cardinality of a sorted set */
  zcard(key: string): Promise<number>
  /** Returns the count of members with scores within a range */
  zcount(key: string, min: number | string, max: number | string): Promise<number>
  /** Increments the score of a member in a sorted set */
  zincrby(key: string, increment: number, member: string): Promise<string>

  /** Returns all keys matching a glob pattern (Warning: O(N) operation) */
  keys(pattern: string): Promise<string[]>
  /** Incrementally iterates over keys using a cursor */
  scan(cursor: string, options?: ScanOptions): Promise<ScanResult>
  /** Returns the data type of a key */
  type(key: string): Promise<string>
  /** Renames a key */
  rename(key: string, newKey: string): Promise<'OK'>
  /** Renames a key only if the new name does not exist */
  renamenx(key: string, newKey: string): Promise<number>

  /** Deletes all keys in the current database */
  flushdb(): Promise<'OK'>
  /** Deletes all keys in all databases */
  flushall(): Promise<'OK'>
  /** Returns the total number of keys in the current database */
  dbsize(): Promise<number>
  /** Returns detailed information and statistics about the server */
  info(section?: string): Promise<string>

  /** Publishes a message to a channel */
  publish(channel: string, message: string): Promise<number>
  /** Subscribes to a channel and executes a callback on incoming messages */
  subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void>
  /** Unsubscribes from a channel */
  unsubscribe(channel: string): Promise<void>

  /** Starts a pipeline for atomic/batch command execution */
  pipeline(): RedisPipelineContract

  /** Executes a Lua script atomically on the Redis server */
  eval(script: string, numKeys: number, ...args: string[]): Promise<unknown>
  /** Executes a Lua script by its SHA1 digest */
  evalsha(sha1: string, numKeys: number, ...args: string[]): Promise<unknown>

  /** Appends a new entry to a stream */
  xadd(key: string, data: Record<string, string>, options?: XAddOptions): Promise<string>
  /** Reads data from one or more streams */
  xread(streams: Record<string, string>, options?: XReadOptions): Promise<StreamReadResult | null>
  /** Reads data from a stream using a consumer group */
  xreadgroup(
    group: string,
    consumer: string,
    streams: Record<string, string>,
    options?: XReadOptions
  ): Promise<StreamReadResult | null>
  /** Creates a new consumer group */
  xgroup(
    command: 'CREATE',
    key: string,
    group: string,
    id?: string,
    mkstream?: boolean
  ): Promise<'OK'>
  /** Destroys a consumer group */
  xgroup(command: 'DESTROY', key: string, group: string): Promise<number>
  /** Deletes a consumer from a consumer group */
  xgroup(command: 'DELCONSUMER', key: string, group: string, consumer: string): Promise<number>
  /** Sets the consumer group last delivered ID */
  xgroup(command: 'SETID', key: string, group: string, id: string): Promise<'OK'>
  /** Acknowledges messages in a consumer group */
  xack(key: string, group: string, ...ids: string[]): Promise<number>
  /** Returns the number of entries in a stream */
  xlen(key: string): Promise<number>
  /** Returns a range of elements in a stream */
  xrange(key: string, start: string, end: string, count?: number): Promise<StreamEntry[]>
  /** Returns a range of elements in a stream in reverse order */
  xrevrange(key: string, end: string, start: string, count?: number): Promise<StreamEntry[]>
  /** Trims the stream to a specified length */
  xtrim(key: string, maxlen: number, approximate?: boolean): Promise<number>
  /** Deletes entries from a stream */
  xdel(key: string, ...ids: string[]): Promise<number>
}

/**
 * Interface for batching multiple Redis commands to be executed as a single network round-trip.
 * @public
 */
export interface RedisPipelineContract {
  /** Queue a GET command */
  get(key: string): this
  /** Queue a SET command */
  set(key: string, value: string, options?: SetOptions): this
  /** Queue a DEL command */
  del(...keys: string[]): this
  /** Queue an INCR command */
  incr(key: string): this
  /** Queue a DECR command */
  decr(key: string): this

  /** Queue an HGET command */
  hget(key: string, field: string): this
  /** Queue an HSET command */
  hset(key: string, field: string, value: string): this
  /** Queue an HGETALL command */
  hgetall(key: string): this

  /** Queue an LPUSH command */
  lpush(key: string, ...values: string[]): this
  /** Queue an RPUSH command */
  rpush(key: string, ...values: string[]): this
  /** Queue an LPOP command */
  lpop(key: string): this
  /** Queue an RPOP command */
  rpop(key: string): this

  /** Queue an SADD command */
  sadd(key: string, ...members: string[]): this
  /** Queue an SREM command */
  srem(key: string, ...members: string[]): this
  /** Queue an SMEMBERS command */
  smembers(key: string): this
  /** Queue an SISMEMBER command */
  sismember(key: string, member: string): this
  /** Queue an SCARD command */
  scard(key: string): this

  /** Executes all queued commands in the pipeline */
  exec(): Promise<PipelineResult>
}
