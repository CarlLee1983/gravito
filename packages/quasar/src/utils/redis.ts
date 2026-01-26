import { Redis, type RedisOptions } from 'ioredis'
import type { Logger } from './logger'

export type ConnectionState = 'connecting' | 'ready' | 'reconnecting' | 'error' | 'closed'

export interface RedisConnectionManager {
  getConnection(): Promise<Redis>
  getClient(): Redis
  onStateChange(callback: (state: ConnectionState) => void): void
  healthCheck(): Promise<boolean>
  close(): Promise<void>
  connect(): Promise<void>
}

export class DefaultRedisConnectionManager implements RedisConnectionManager {
  private client: Redis
  private logger?: Logger
  private state: ConnectionState = 'closed'
  private stateListeners: ((state: ConnectionState) => void)[] = []

  constructor(urlOrClient: string | Redis, options: RedisOptions = {}, logger?: Logger) {
    this.logger = logger
    if (typeof urlOrClient === 'string') {
      this.client = new Redis(urlOrClient, {
        lazyConnect: true,
        ...options,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      })
    } else {
      this.client = urlOrClient
    }

    this.setupListeners()
  }

  private setupListeners() {
    this.client.on('connect', () => this.updateState('connecting'))
    this.client.on('ready', () => this.updateState('ready'))
    this.client.on('reconnecting', () => this.updateState('reconnecting'))
    this.client.on('error', (err) => {
      this.updateState('error')
      this.logger?.error('Redis connection error', err)
    })
    this.client.on('close', () => this.updateState('closed'))
  }

  private updateState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState
      this.stateListeners.forEach((cb) => {
        cb(newState)
      })
      this.logger?.debug(`Redis state changed to: ${newState}`)
    }
  }

  async connect(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') return
    await this.client.connect()
  }

  async getConnection(): Promise<Redis> {
    if (this.client.status !== 'ready') {
      await this.connect()
    }
    return this.client
  }

  getClient(): Redis {
    return this.client
  }

  onStateChange(callback: (state: ConnectionState) => void): void {
    this.stateListeners.push(callback)
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping()
      return true
    } catch {
      return false
    }
  }

  async close(): Promise<void> {
    await this.client.quit()
  }
}
