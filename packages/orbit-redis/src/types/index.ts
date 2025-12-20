/**
 * @gravito/orbit-redis - Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  /** Redis host */
  host?: string
  /** Redis port */
  port?: number
  /** Redis password */
  password?: string
  /** Database index (0-15) */
  db?: number
  /** Connection timeout in ms */
  connectTimeout?: number
  /** Command timeout in ms */
  commandTimeout?: number
  /** TLS/SSL options */
  tls?: boolean | TLSOptions
  /** Key prefix for all operations */
  keyPrefix?: string
  /** Maximum retry attempts */
  maxRetries?: number
  /** Retry delay in ms */
  retryDelay?: number
}

/**
 * TLS configuration options
 */
export interface TLSOptions {
  rejectUnauthorized?: boolean
  ca?: string
  cert?: string
  key?: string
}

/**
 * Redis manager configuration
 */
export interface RedisManagerConfig {
  /** Default connection name */
  default?: string
  /** Named connections */
  connections: Record<string, RedisConfig>
}

// ============================================================================
// Command Options
// ============================================================================

/**
 * SET command options
 */
export interface SetOptions {
  /** Expiration in seconds */
  ex?: number
  /** Expiration in milliseconds */
  px?: number
  /** Set only if key exists */
  xx?: boolean
  /** Set only if key does not exist */
  nx?: boolean
  /** Keep existing TTL */
  keepttl?: boolean
}

/**
 * ZADD command options
 */
export interface ZAddOptions {
  /** Score */
  score: number
  /** Member */
  member: string
}

/**
 * ZRANGE options
 */
export interface ZRangeOptions {
  /** Reverse order */
  rev?: boolean
  /** Include scores in result */
  withScores?: boolean
}

/**
 * Scan options
 */
export interface ScanOptions {
  /** Pattern to match */
  match?: string
  /** Number of elements to return per iteration */
  count?: number
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Scan result
 */
export interface ScanResult {
  cursor: string
  keys: string[]
}

/**
 * Pipeline result
 */
export type PipelineResult = [error: Error | null, result: unknown][]

// ============================================================================
// Contract Interfaces
// ============================================================================

/**
 * Redis Client Contract
 */
export interface RedisClientContract {
  // Connection
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  ping(): Promise<string>

  // String operations
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: SetOptions): Promise<'OK' | null>
  del(...keys: string[]): Promise<number>
  exists(...keys: string[]): Promise<number>
  incr(key: string): Promise<number>
  incrby(key: string, increment: number): Promise<number>
  decr(key: string): Promise<number>
  decrby(key: string, decrement: number): Promise<number>
  append(key: string, value: string): Promise<number>
  strlen(key: string): Promise<number>
  getset(key: string, value: string): Promise<string | null>
  mget(...keys: string[]): Promise<(string | null)[]>
  mset(pairs: Record<string, string>): Promise<'OK'>

  // TTL operations
  expire(key: string, seconds: number): Promise<number>
  expireat(key: string, timestamp: number): Promise<number>
  pexpire(key: string, milliseconds: number): Promise<number>
  ttl(key: string): Promise<number>
  pttl(key: string): Promise<number>
  persist(key: string): Promise<number>

  // Hash operations
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, fieldOrData: string | Record<string, string>, value?: string): Promise<number>
  hdel(key: string, ...fields: string[]): Promise<number>
  hexists(key: string, field: string): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  hincrby(key: string, field: string, increment: number): Promise<number>
  hkeys(key: string): Promise<string[]>
  hvals(key: string): Promise<string[]>
  hlen(key: string): Promise<number>
  hmget(key: string, ...fields: string[]): Promise<(string | null)[]>
  hmset(key: string, data: Record<string, string>): Promise<'OK'>

  // List operations
  lpush(key: string, ...values: string[]): Promise<number>
  rpush(key: string, ...values: string[]): Promise<number>
  lpop(key: string): Promise<string | null>
  rpop(key: string): Promise<string | null>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  llen(key: string): Promise<number>
  lindex(key: string, index: number): Promise<string | null>
  lset(key: string, index: number, value: string): Promise<'OK'>
  lrem(key: string, count: number, value: string): Promise<number>
  ltrim(key: string, start: number, stop: number): Promise<'OK'>

  // Set operations
  sadd(key: string, ...members: string[]): Promise<number>
  srem(key: string, ...members: string[]): Promise<number>
  smembers(key: string): Promise<string[]>
  sismember(key: string, member: string): Promise<number>
  scard(key: string): Promise<number>
  spop(key: string, count?: number): Promise<string | string[] | null>
  srandmember(key: string, count?: number): Promise<string | string[] | null>
  sunion(...keys: string[]): Promise<string[]>
  sinter(...keys: string[]): Promise<string[]>
  sdiff(...keys: string[]): Promise<string[]>

  // Sorted Set operations
  zadd(key: string, ...items: ZAddOptions[]): Promise<number>
  zrem(key: string, ...members: string[]): Promise<number>
  zscore(key: string, member: string): Promise<string | null>
  zrank(key: string, member: string): Promise<number | null>
  zrevrank(key: string, member: string): Promise<number | null>
  zrange(key: string, start: number, stop: number, options?: ZRangeOptions): Promise<string[]>
  zrevrange(key: string, start: number, stop: number, options?: ZRangeOptions): Promise<string[]>
  zcard(key: string): Promise<number>
  zcount(key: string, min: number | string, max: number | string): Promise<number>
  zincrby(key: string, increment: number, member: string): Promise<string>

  // Key operations
  keys(pattern: string): Promise<string[]>
  scan(cursor: string, options?: ScanOptions): Promise<ScanResult>
  type(key: string): Promise<string>
  rename(key: string, newKey: string): Promise<'OK'>
  renamenx(key: string, newKey: string): Promise<number>

  // Server operations
  flushdb(): Promise<'OK'>
  flushall(): Promise<'OK'>
  dbsize(): Promise<number>
  info(section?: string): Promise<string>

  // Pub/Sub
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void>
  unsubscribe(channel: string): Promise<void>

  // Pipeline
  pipeline(): RedisPipelineContract
}

/**
 * Redis Pipeline Contract
 */
export interface RedisPipelineContract {
  // String operations
  get(key: string): this
  set(key: string, value: string, options?: SetOptions): this
  del(...keys: string[]): this
  incr(key: string): this
  decr(key: string): this

  // Hash operations
  hget(key: string, field: string): this
  hset(key: string, field: string, value: string): this
  hgetall(key: string): this

  // List operations
  lpush(key: string, ...values: string[]): this
  rpush(key: string, ...values: string[]): this
  lpop(key: string): this
  rpop(key: string): this

  // Set operations
  sadd(key: string, ...members: string[]): this
  srem(key: string, ...members: string[]): this
  smembers(key: string): this
  sismember(key: string, member: string): this
  scard(key: string): this

  // Execute pipeline
  exec(): Promise<PipelineResult>
}
