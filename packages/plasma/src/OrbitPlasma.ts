import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { Redis } from './Redis'
import type { RedisClientContract, RedisConfig, RedisManagerConfig } from './types'

/**
 * OrbitPlasma configuration options.
 */
export interface OrbitPlasmaOptions extends Partial<RedisManagerConfig> {
  /**
   * Expose as (default: 'redis')
   */
  exposeAs?: string

  /**
   * Auto-connect on install
   */
  autoConnect?: boolean
}

/**
 * OrbitPlasma - Redis Orbit
 *
 * Gravito Orbit implementation providing Redis functionality.
 */
export class OrbitPlasma implements GravitoOrbit {
  private client?: RedisClientContract
  private connected = false

  constructor(private options: OrbitPlasmaOptions = {}) {}

  /**
   * Static configuration helper.
   */
  static configure(options: OrbitPlasmaOptions): OrbitPlasma {
    return new OrbitPlasma(options)
  }

  /**
   * Install into PlanetCore.
   */
  install(core: PlanetCore): void {
    const { exposeAs = 'redis' } = this.options

    // Get config from options or core config
    const config = this.options.connections
      ? this.options
      : (core.config.get<RedisConfig | RedisManagerConfig>('redis') as RedisManagerConfig | null)

    if (!config) {
      core.logger.warn('[OrbitPlasma] No Redis configuration found. Skipping initialization.')
      return
    }

    // Check if config is a simple RedisConfig or full RedisManagerConfig
    if ('connections' in config && config.connections) {
      // Full manager config
      Redis.configure(config as RedisManagerConfig)
    } else {
      // Simple config - wrap in default connection
      Redis.configure({
        default: 'default',
        connections: {
          default: config as RedisConfig,
        },
      })
    }

    // Get the default client
    this.client = Redis.connection()

    // Connect lazily on first use (or immediately if autoConnect is true)
    const autoConnect = this.options.autoConnect

    if (autoConnect) {
      Redis.connect().catch((err) => {
        core.logger.error('[OrbitPlasma] Failed to auto-connect:', err)
      })
      this.connected = true
    }

    // Inject redis service into Context
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      // Ensure connected if not already
      if (!this.connected && this.client) {
        try {
          if (!this.client.isConnected()) {
            await this.client.connect()
          }
          this.connected = true
        } catch {
          // Connection failed, continue without redis (will error on use)
        }
      }

      c.set(exposeAs, this.client)
      return await next()
    })

    // Register in core container for global access (CLI, Jobs)
    if (this.client) {
      core.container.instance(exposeAs, this.client)
    }

    core.logger.info(`[OrbitPlasma] Installed (Exposed as: ${exposeAs})`)

    // Register shutdown hook
    core.hooks.doAction('core:shutdown', async () => {
      await this.disconnect()
    })
  }

  /**
   * Disconnect from Redis.
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.disconnect()
      this.connected = false
    }
  }

  /**
   * Get the Redis client instance.
   */
  getClient(): RedisClientContract | undefined {
    return this.client
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected && (this.client?.isConnected() ?? false)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Redis client from OrbitPlasma */
    redis?: RedisClientContract
  }
}
