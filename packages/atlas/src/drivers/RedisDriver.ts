/**
 * Redis Driver
 * @description Driver implementation for Redis using ioredis
 */

import Redis from 'ioredis'
import { ConnectionError, DatabaseError } from '../errors'
import type {
    ConnectionConfig,
    DriverContract,
    DriverType,
    ExecuteResult,
    QueryResult,
    RedisConfig,
} from '../types'

/**
 * Redis Driver
 * Provides a key-value interface via DB.connection('redis')
 */
export class RedisDriver implements DriverContract {
    private config: RedisConfig
    private client: Redis | null = null

    constructor(config: ConnectionConfig) {
        if (config.driver !== 'redis') {
            throw new Error(`Invalid driver type '${config.driver}' for RedisDriver`)
        }
        this.config = config as RedisConfig
    }

    getDriverName(): DriverType {
        return 'redis'
    }

    async connect(): Promise<void> {
        if (this.client) return

        try {
            this.client = new Redis({
                host: this.config.host,
                port: this.config.port ?? 6379,
                password: this.config.password,
                db: this.config.db ?? 0,
                lazyConnect: true,
            })
            await this.client.connect()
        } catch (error) {
            throw new ConnectionError('Could not connect to Redis host', error)
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit()
            this.client = null
        }
    }

    isConnected(): boolean {
        return this.client !== null && this.client.status === 'ready'
    }

    /**
     * Raw Redis command execution via pseudo-SQL or direct mapping
     */
    async query<T = any>(sql: string, _bindings: unknown[] = []): Promise<QueryResult<T>> {
        if (!this.client) await this.connect()

        // For Redis, we treat 'query' as a way to send raw commands if needed, 
        // but usually it's used via specialized methods.
        throw new Error('Direct SQL query not supported on Redis driver. Use specialized Redis methods.')
    }

    async execute(_sql: string, _bindings: unknown[] = []): Promise<ExecuteResult> {
        throw new Error('Direct SQL execution not supported on Redis driver.')
    }

    // Redis Specific Methods (Exposed via connection proxy or direct access)
    async get(key: string): Promise<string | null> {
        if (!this.client) await this.connect()
        return this.client!.get(key)
    }

    async set(key: string, value: string | number): Promise<'OK'> {
        if (!this.client) await this.connect()
        return this.client!.set(key, value)
    }

    async setex(key: string, seconds: number, value: string | number): Promise<'OK'> {
        if (!this.client) await this.connect()
        return this.client!.setex(key, seconds, value)
    }

    async del(key: string): Promise<number> {
        if (!this.client) await this.connect()
        return this.client!.del(key)
    }

    /**
     * Get the raw ioredis client for advanced operations
     */
    getRawClient(): Redis {
        if (!this.client) throw new Error('Redis client not connected')
        return this.client
    }

    // Transactions (Redis MULTI/EXEC)
    async beginTransaction(): Promise<void> {
        if (!this.client) await this.connect()
        // In Redis, we just start a multi
    }

    async commit(): Promise<void> {
        // Implement via EXEC
    }

    async rollback(): Promise<void> {
        // Implement via DISCARD
    }

    inTransaction(): boolean {
        return false // Basic implementation
    }
}
