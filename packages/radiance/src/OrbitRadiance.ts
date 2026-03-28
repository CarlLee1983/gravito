import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { BroadcastManager } from './BroadcastManager'
import { RadianceError } from './errors/RadianceError'
import { RadianceErrorCodes } from './errors/codes'

type HealthRegistry = {
  register: (name: string, fn: () => Promise<{ status: string; details?: Record<string, unknown> }>) => void
}
import type { AblyDriverConfig } from './drivers/AblyDriver'
import { AblyDriver } from './drivers/AblyDriver'
import type { BroadcastDriver } from './drivers/BroadcastDriver'
import type { PusherDriverConfig } from './drivers/PusherDriver'
import { PusherDriver } from './drivers/PusherDriver'
import type { RedisDriverConfig } from './drivers/RedisDriver'
import { RedisDriver } from './drivers/RedisDriver'
import type { WebSocketDriverConfig } from './drivers/WebSocketDriver'
import { WebSocketDriver } from './drivers/WebSocketDriver'

/**
 * Configuration options for the Radiance broadcasting orbit.
 *
 * Defines the delivery provider, its specific credentials, and optional
 * hooks for security and error handling.
 *
 * @public
 */
export interface OrbitRadianceOptions {
  /**
   * The underlying delivery service provider.
   *
   * - pusher: Industry standard WebSocket service
   * - ably: High-reliability global edge network
   * - redis: Pub/Sub for internal microservices
   * - websocket: Direct server-to-client communication
   */
  driver: 'pusher' | 'ably' | 'redis' | 'websocket'

  /**
   * Provider-specific connection and authentication settings.
   */
  config: PusherDriverConfig | AblyDriverConfig | RedisDriverConfig | WebSocketDriverConfig

  /**
   * Hook for implementing custom channel access control.
   *
   * @param channel - The name of the channel being accessed
   * @param socketId - The unique client connection identifier
   * @param userId - The authenticated user's identifier
   * @returns True if the subscription request should be granted
   */
  authorizeChannel?: (
    channel: string,
    socketId: string,
    userId?: string | number
  ) => Promise<boolean>

  /**
   * Control whether broadcast failures should interrupt the execution flow.
   * @defaultValue true
   */
  throwOnError?: boolean
}

/**
 * OrbitRadiance provides real-time event broadcasting capabilities.
 *
 * It abstracts various delivery providers (Pusher, Ably, etc.) and integrates
 * seamlessly with Gravito's Event system. When installed, it enables automatic
 * broadcasting of events that implement the `ShouldBroadcast` interface.
 *
 * @example
 * ```typescript
 * const radiance = OrbitRadiance.configure({
 *   driver: 'pusher',
 *   config: { appId: '...', key: '...', secret: '...' }
 * });
 * core.addOrbit(radiance);
 * ```
 * @public
 */
export class OrbitRadiance implements GravitoOrbit {
  private options: OrbitRadianceOptions

  constructor(options: OrbitRadianceOptions) {
    this.options = options
  }

  /**
   * Create a new OrbitRadiance instance with the specified configuration.
   *
   * This static factory method is the preferred way to initialize the orbit
   * before adding it to the PlanetCore.
   *
   * @param options - The configuration settings for the broadcaster
   * @returns A configured OrbitRadiance instance
   *
   * @example
   * ```typescript
   * const orbit = OrbitRadiance.configure({
   *   driver: 'redis',
   *   config: { url: 'redis://localhost:6379' }
   * });
   * ```
   */
  static configure(options: OrbitRadianceOptions): OrbitRadiance {
    return new OrbitRadiance(options)
  }

  /**
   * Initialize and register the broadcasting system into the core.
   *
   * Sets up the BroadcastManager, initializes the selected driver, and
   * hooks into the EventManager to enable automatic event broadcasting.
   *
   * @param core - The PlanetCore instance where the orbit is being installed
   * @throws {Error} If an unsupported driver is specified in options
   */
  async install(core: PlanetCore): Promise<void> {
    const manager = new BroadcastManager(core)

    if (this.options.throwOnError !== undefined) {
      manager.setThrowOnError(this.options.throwOnError)
    }

    // Create and set driver.
    let driver: BroadcastDriver

    switch (this.options.driver) {
      case 'pusher':
        driver = new PusherDriver(this.options.config as PusherDriverConfig)
        break
      case 'ably':
        driver = new AblyDriver(this.options.config as AblyDriverConfig)
        break
      case 'redis': {
        driver = new RedisDriver(this.options.config as RedisDriverConfig)
        // If a Redis client is provided via core container, set it.
        const redisClient = core.container.make('redis') as
          | { publish(channel: string, message: string): Promise<number> }
          | undefined
        if (redisClient) {
          ;(driver as RedisDriver).setRedisClient(redisClient)
        }
        break
      }
      case 'websocket': {
        const wsConfig = this.options.config as WebSocketDriverConfig
        if (!wsConfig.logger) {
          wsConfig.logger = core.logger
        }
        driver = new WebSocketDriver(wsConfig)
        break
      }
      default:
        throw new RadianceError(
          RadianceErrorCodes.UNSUPPORTED_DRIVER,
          `Unsupported broadcast driver: ${this.options.driver}`
        )
    }

    manager.setDriver(driver)

    // Set auth callback.
    if (this.options.authorizeChannel) {
      manager.setAuthCallback(this.options.authorizeChannel)
    }

    // Register into core container
    core.container.instance('broadcast', manager)

    // Integrate with EventManager.
    if (core.events) {
      core.events.setBroadcastManager({
        broadcast: async (event: any, channel: any, data: any, eventName: any) => {
          await manager.broadcast(event, channel, data, eventName)
        },
      })
    }

    // Health check registration (INTG-04)
    const health = core.container.make('health') as HealthRegistry | null | undefined
    if (health) {
      const driverName = this.options.driver
      health.register('radiance', async () => ({
        status: 'healthy',
        details: {
          driver: driverName,
        },
      }))
    }

    core.logger.info(`[OrbitRadiance] Installed with ${this.options.driver} driver`)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Broadcaster manager for real-time events */
    broadcast?: BroadcastManager
  }
}
