/**
 * @fileoverview NATS driver for @gravito/ripple
 *
 * @module @gravito/ripple/drivers
 */

import type { ConnectionOptions, NatsConnection } from 'nats'
import { RippleDriverError } from '../errors/RippleError'
import type { RippleLogger } from '../logging/Logger'
import { createLogger } from '../logging/Logger'
import type { DriverStatus, PresenceUserInfo, RippleDriver } from '../types'

/**
 * Configuration for the NATSDriver.
 */
export interface NATSDriverConfig {
  /** NATS server URL (default: 'nats://localhost:4222') */
  servers?: string | string[]
  /** Credentials for authentication */
  user?: string
  password?: string
  token?: string
  /** Prefix for Ripple NATS subjects (default: 'ripple.') */
  subjectPrefix?: string
  /** Custom logger instance */
  logger?: RippleLogger
  /** Optional NATS connection options */
  connectionOptions?: ConnectionOptions
}

/**
 * NATS driver for Ripple, offering high-performance distributed broadcasting.
 *
 * @example
 * ```typescript
 * import { RippleServer, NATSDriver } from '@gravito/ripple'
 *
 * const server = new RippleServer({
 *   driver: 'nats',
 *   nats: {
 *     servers: 'nats://localhost:4222'
 *   }
 * })
 * ```
 */
export class NATSDriver implements RippleDriver {
  readonly name = 'nats'

  private nats?: NatsConnection
  private subjectPrefix: string
  private subscriptions = new Map<string, any>()
  private callbacks = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false
  private _connected = false
  private _lastError?: string
  private logger: RippleLogger

  constructor(private config: NATSDriverConfig = {}) {
    this.subjectPrefix = config.subjectPrefix ?? 'ripple.'
    this.logger = config.logger ?? createLogger('NATSDriver')
  }

  get isInitialized(): boolean {
    return this._initialized
  }

  async init(): Promise<void> {
    if (this._initialized) return

    this.logger.info('Initializing NATSDriver', {
      servers: this.config.servers ?? 'nats://localhost:4222',
    })

    try {
      const { connect } = await import('nats')
      this.nats = await connect({
        servers: this.config.servers ?? 'nats://localhost:4222',
        user: this.config.user,
        password: this.config.password,
        token: this.config.token,
        ...this.config.connectionOptions,
      })

      this._connected = true
      this._initialized = true

      this.nats.closed().then((err: Error | null) => {
        this._connected = false
        if (err) {
          this.handleError(err)
        }
      })

      this.logger.info('NATSDriver initialized successfully')
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : String(error)
      throw new RippleDriverError('NATS_CONNECTION_FAILED', this._lastError)
    }
  }

  async publish(channel: string, event: string, data: unknown): Promise<void> {
    if (!this.nats || !this._initialized) {
      throw new RippleDriverError('DRIVER_NOT_INITIALIZED', 'NATSDriver not initialized')
    }

    const subject = this.subjectPrefix + channel
    const sc = (await import('nats')).JSONCodec()
    this.nats.publish(subject, sc.encode({ event, data }))
  }

  async subscribe(
    channel: string,
    callback: (event: string, data: unknown) => void
  ): Promise<void> {
    if (!this.nats || !this._initialized) {
      throw new RippleDriverError('DRIVER_NOT_INITIALIZED', 'NATSDriver not initialized')
    }

    const subject = this.subjectPrefix + channel

    if (!this.callbacks.has(subject)) {
      this.callbacks.set(subject, new Set())

      const sc = (await import('nats')).JSONCodec()
      const sub = this.nats.subscribe(subject)
      this.subscriptions.set(subject, sub)

      ;(async () => {
        for await (const m of sub) {
          try {
            const { event, data } = sc.decode(m.data) as any
            const channelCallbacks = this.callbacks.get(subject)
            if (channelCallbacks) {
              for (const cb of channelCallbacks) {
                cb(event, data)
              }
            }
          } catch (_e) {
            this.logger.error('Failed to decode NATS message', { subject })
          }
        }
      })()
    }

    this.callbacks.get(subject)?.add(callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    const subject = this.subjectPrefix + channel
    const sub = this.subscriptions.get(subject)
    if (sub) {
      sub.unsubscribe()
      this.subscriptions.delete(subject)
      this.callbacks.delete(subject)
    }
  }

  async shutdown(): Promise<void> {
    if (this.nats) {
      await this.nats.close()
    }
    this._initialized = false
    this._connected = false
  }

  getStatus(): DriverStatus {
    return {
      name: this.name,
      initialized: this._initialized,
      connected: this._connected,
      lastError: this._lastError,
    }
  }

  // Presence logic using KV Store
  /**
   * Track presence member using NATS KV Store.
   *
   * Creates or updates a bucket for the channel and stores user info with TTL.
   *
   * @param channel - Presence channel name
   * @param userInfo - User information to store
   * @since 4.0.0-alpha
   */
  async trackPresence(channel: string, userInfo: PresenceUserInfo): Promise<void> {
    if (!this.nats || !this._initialized) {
      throw new RippleDriverError('DRIVER_NOT_INITIALIZED', 'NATSDriver not initialized')
    }

    try {
      const { jetstream } = await import('nats')
      const js = this.nats.jetstream()
      const bucketName = `ripple_presence_${channel.replace(/[^a-zA-Z0-9_-]/g, '_')}`

      // Get or create KV bucket with 5-minute TTL
      let kv: any
      try {
        kv = await js.views.kv(bucketName)
      } catch {
        // Bucket doesn't exist, create it
        kv = await js.views.kv(bucketName, {
          ttl: 300000, // 5 minutes in milliseconds
          history: 1, // Only keep latest value
          max_bytes: 1024 * 1024, // 1MB max
        })
        this.logger.debug('Created NATS KV bucket for presence', { bucketName })
      }

      // Store user info
      const userId = String(userInfo.id)
      const codec = jetstream().StringCodec()
      await kv.put(userId, codec.encode(JSON.stringify(userInfo)))

      this.logger.debug('Tracked presence member in NATS KV', { channel, userId })
    } catch (error) {
      this.logger.error('Failed to track presence in NATS KV', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new RippleDriverError(
        'NATS_KV_OPERATION_FAILED',
        `Failed to track presence: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Remove presence member from NATS KV Store.
   *
   * @param channel - Presence channel name
   * @param userId - User ID to remove
   * @since 4.0.0-alpha
   */
  async untrackPresence(channel: string, userId: string | number): Promise<void> {
    if (!this.nats || !this._initialized) {
      throw new RippleDriverError('DRIVER_NOT_INITIALIZED', 'NATSDriver not initialized')
    }

    try {
      await import('nats')
      const js = this.nats.jetstream()
      const bucketName = `ripple_presence_${channel.replace(/[^a-zA-Z0-9_-]/g, '_')}`

      try {
        const kv = await js.views.kv(bucketName)
        await kv.delete(String(userId))
        this.logger.debug('Untracked presence member from NATS KV', { channel, userId })
      } catch (_error) {
        // Bucket or key might not exist, which is fine
        this.logger.debug('Presence member not found in NATS KV', { channel, userId })
      }
    } catch (error) {
      this.logger.error('Failed to untrack presence in NATS KV', {
        channel,
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get all presence members from NATS KV Store.
   *
   * @param channel - Presence channel name
   * @returns Array of presence user information
   * @since 4.0.0-alpha
   */
  async getPresenceMembers(channel: string): Promise<PresenceUserInfo[]> {
    if (!this.nats || !this._initialized) {
      throw new RippleDriverError('DRIVER_NOT_INITIALIZED', 'NATSDriver not initialized')
    }

    const members: PresenceUserInfo[] = []

    try {
      const { jetstream } = await import('nats')
      const js = this.nats.jetstream()
      const bucketName = `ripple_presence_${channel.replace(/[^a-zA-Z0-9_-]/g, '_')}`

      try {
        const kv = await js.views.kv(bucketName)
        const codec = jetstream().StringCodec()

        // Get all keys
        const keys = await kv.keys()

        // Fetch each member's info
        for await (const key of keys) {
          try {
            const entry = await kv.get(key)
            if (entry) {
              const userInfoJson = codec.decode(entry.value)
              const userInfo = JSON.parse(userInfoJson)
              members.push(userInfo)
            }
          } catch (parseError) {
            this.logger.error('Failed to parse presence member data', {
              channel,
              key,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            })
          }
        }

        this.logger.debug('Retrieved presence members from NATS KV', {
          channel,
          count: members.length,
        })
      } catch (_error) {
        // Bucket doesn't exist, return empty array
        this.logger.debug('Presence bucket not found in NATS KV', { channel })
      }
    } catch (_error) {
      this.logger.error('Failed to get presence members from NATS KV', {
        channel,
        error: _error instanceof Error ? _error.message : String(_error),
      })
    }

    return members
  }

  private handleError(error: Error): void {
    this._lastError = error.message
    this.logger.error('NATS error', { error: error.message })
  }
}
