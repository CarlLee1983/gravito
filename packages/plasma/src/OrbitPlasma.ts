import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { Redis } from './Redis'
import type { RedisClientContract, RedisConfig, RedisManagerConfig } from './types'

/**
 * Configuration options for the OrbitPlasma Redis orbit.
 * @public
 */
export interface OrbitPlasmaOptions extends Partial<RedisManagerConfig> {
  /**
   * The key used to expose the Redis client in the context (default: 'redis').
   * Allows accessing the service via `ctx.get('redis')`.
   */
  exposeAs?: string

  /**
   * Whether to establish a connection to Redis immediately during installation.
   * If false, the connection will be established lazily on the first request.
   */
  autoConnect?: boolean
}

/**
 * OrbitPlasma is the high-performance Redis integration for Gravito,
 * optimized for Bun's native TCP and Unix socket capabilities.
 * It provides a clean, Laravel-style API for all Redis data structures.
 *
 * It automatically handles connection pooling, lazy connection,
 * and graceful shutdown.
 *
 * @example
 * ```typescript
 * const plasma = new OrbitPlasma({
 *   connections: {
 *     default: { host: 'localhost', port: 6379 }
 *   }
 * });
 * core.addOrbit(plasma);
 * ```
 * @public
 */
export class OrbitPlasma implements GravitoOrbit {
  private client?: RedisClientContract
  private connected = false

  constructor(private options: OrbitPlasmaOptions = {}) {}

  /**
   * Factory method for fluent configuration.
   *
   * Provides a chainable API for instantiating OrbitPlasma with configuration,
   * commonly used in application bootstrap files.
   *
   * @param options - Orbit configuration including connections and expose settings.
   * @returns Configured OrbitPlasma instance ready for installation.
   *
   * @example
   * ```typescript
   * const plasma = OrbitPlasma.configure({
   *   connections: {
   *     default: { host: 'localhost', port: 6379 }
   *   },
   *   exposeAs: 'redis',
   *   autoConnect: true
   * });
   * core.addOrbit(plasma);
   * ```
   */
  static configure(options: OrbitPlasmaOptions): OrbitPlasma {
    return new OrbitPlasma(options)
  }

  /**
   * Lifecycle hook for Gravito orbit registration.
   *
   * Integrates Redis into the framework by:
   * - Configuring connection pool from core config or orbit options
   * - Injecting client into request context for controller access
   * - Registering shutdown hooks for graceful disconnection
   *
   * @param core - PlanetCore instance providing config, container, and hooks.
   *
   * @example
   * ```typescript
   * // Automatically called by Gravito when registering the orbit
   * core.addOrbit(new OrbitPlasma({
   *   connections: {
   *     default: { host: 'localhost', port: 6379 }
   *   }
   * }));
   * ```
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
   * Gracefully close Redis connections.
   *
   * Ensures all pending commands complete before terminating TCP sockets,
   * preventing data loss during application shutdown.
   *
   * @example
   * ```typescript
   * await plasma.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.disconnect()
      this.connected = false
    }
  }

  /**
   * Access the underlying Redis client.
   *
   * Useful for direct client operations outside request context,
   * such as CLI commands or background jobs.
   *
   * @returns The active client instance, or undefined if not yet initialized.
   *
   * @example
   * ```typescript
   * const client = plasma.getClient();
   * if (client) {
   *   await client.flushdb();
   * }
   * ```
   */
  getClient(): RedisClientContract | undefined {
    return this.client
  }

  /**
   * Verify connection health.
   *
   * Checks both internal connection state and client socket status
   * to ensure Redis is reachable.
   *
   * @returns True if connected and ready for commands.
   *
   * @example
   * ```typescript
   * if (!plasma.isConnected()) {
   *   console.warn('Redis unavailable, using fallback cache');
   * }
   * ```
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
