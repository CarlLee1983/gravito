/**
 * Bun.redis Client Type Definitions
 * @internal
 */

export interface RedisClient {
  connected?: boolean
  connect(): Promise<void>
  close(): void | Promise<void>
  ping(): Promise<string>
  get(key: string): Promise<string | null>
  set(key: string, value: string | number, ...args: (string | number)[]): Promise<string | null>
  del(...keys: string[]): Promise<number>
  exists(...keys: string[]): Promise<boolean>
  incr(key: string): Promise<number>
  incrby(key: string, increment: number): Promise<number>
  decr(key: string): Promise<number>
  decrby(key: string, decrement: number): Promise<number>
  expire(key: string, seconds: number): Promise<boolean>
  ttl(key: string): Promise<number>
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<number>
  hset(key: string, data: Record<string, string>): Promise<number>
  hdel(key: string, ...fields: string[]): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  hincrby(key: string, field: string, increment: number): Promise<number>
  hmget(key: string, ...fields: string[]): Promise<(string | null)[]>
  sadd(key: string, ...members: string[]): Promise<number>
  srem(key: string, ...members: string[]): Promise<number>
  smembers(key: string): Promise<string[]>
  sismember(key: string, member: string): Promise<boolean>
  spop(key: string): Promise<string | null>
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string, callback: (message: string) => void): Promise<void>
  unsubscribe(channel: string): Promise<void>
  send(command: (string | number)[], ...args: (string | number)[]): Promise<unknown>
  duplicate(): RedisClient
}

export interface RedisClientOptions {
  connectionTimeout?: number
  idleTimeout?: number
  autoReconnect?: boolean
  maxRetries?: number
  enableOfflineQueue?: boolean
  enableAutoPipelining?: boolean
  tls?: boolean | TLSOptions
}

export interface TLSOptions {
  rejectUnauthorized?: boolean
  ca?: string
  cert?: string
  key?: string
}
