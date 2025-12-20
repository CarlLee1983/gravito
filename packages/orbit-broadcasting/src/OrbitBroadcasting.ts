import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { BroadcastManager } from './BroadcastManager'
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
 * OrbitBroadcasting options.
 */
export interface OrbitBroadcastingOptions {
  /**
   * Driver type.
   */
  driver: 'pusher' | 'ably' | 'redis' | 'websocket'

  /**
   * Driver configuration.
   */
  config: PusherDriverConfig | AblyDriverConfig | RedisDriverConfig | WebSocketDriverConfig

  /**
   * Channel authorization callback (optional).
   */
  authorizeChannel?: (
    channel: string,
    socketId: string,
    userId?: string | number
  ) => Promise<boolean>
}

/**
 * Broadcasting Orbit
 *
 * Provides broadcasting capabilities with multiple drivers (Pusher, Ably, Redis, WebSocket).
 */
export class OrbitBroadcasting implements GravitoOrbit {
  private options: OrbitBroadcastingOptions

  constructor(options: OrbitBroadcastingOptions) {
    this.options = options
  }

  /**
   * Configure OrbitBroadcasting.
   */
  static configure(options: OrbitBroadcastingOptions): OrbitBroadcasting {
    return new OrbitBroadcasting(options)
  }

  async install(core: PlanetCore): Promise<void> {
    const manager = new BroadcastManager(core)

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
        // If a Redis client is provided via core services, set it.
        const redisClient = core.services.get('redis') as
          | { publish(channel: string, message: string): Promise<number> }
          | undefined
        if (redisClient) {
          ;(driver as RedisDriver).setRedisClient(redisClient)
        }
        break
      }
      case 'websocket':
        driver = new WebSocketDriver(this.options.config as WebSocketDriverConfig)
        break
      default:
        throw new Error(`Unsupported broadcast driver: ${this.options.driver}`)
    }

    manager.setDriver(driver)

    // Set auth callback.
    if (this.options.authorizeChannel) {
      manager.setAuthCallback(this.options.authorizeChannel)
    }

    // Register into core services.
    core.services.set('broadcast', manager)

    // Integrate with EventManager.
    if (core.events) {
      core.events.setBroadcastManager({
        broadcast: async (event: any, channel: any, data: any, eventName: any) => {
          await manager.broadcast(event, channel, data, eventName)
        },
      })
    }

    core.logger.info(`[OrbitBroadcasting] Installed with ${this.options.driver} driver`)
  }
}
