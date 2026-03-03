/**
 * Redis Driver
 * @description Driver implementation for Redis using ioredis
 */
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
} from '../types'
/**
 * Redis Driver
 * Provides a key-value interface via DB.connection('redis')
 */
import type { RedisClient } from './types'
export declare class RedisDriver implements DriverContract {
  private config
  private client
  private RedisCtor?
  constructor(
    config: ConnectionConfig,
    deps?: {
      Redis?: new (config: Record<string, unknown>) => RedisClient
    }
  )
  getDriverName(): DriverType
  connect(): Promise<void>
  /**
   * Dynamically load ioredis module
   */
  private loadRedisModule
  disconnect(): Promise<void>
  isConnected(): boolean
  /**
   * Raw Redis command execution via pseudo-SQL or direct mapping
   */
  query<T = any>(_sql: string, _bindings?: unknown[]): Promise<QueryResult<T>>
  execute(_sql: string, _bindings?: unknown[]): Promise<ExecuteResult>
  get(key: string): Promise<string | null>
  set(key: string, value: string | number): Promise<'OK'>
  setex(key: string, seconds: number, value: string | number): Promise<'OK'>
  del(key: string): Promise<number>
  /**
   * Get the raw ioredis client for advanced operations
   */
  getRawClient(): RedisClient | null
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  inTransaction(): boolean
}
