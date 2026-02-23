import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { setRippleServer } from './events/Broadcaster'
import { BroadcastManager } from './events/BroadcastManager'
import { RippleServer } from './RippleServer'
import type { RippleConfig } from './types'

/**
 * OrbitRipple integrates the Ripple WebSocket module into the Gravito framework.
 *
 * It handles the registration of the RippleServer in the IoC container,
 * adds middleware for context access, and manages the server lifecycle.
 *
 * @example
 * ```typescript
 * import { PlanetCore } from '@gravito/core'
 * import { OrbitRipple } from '@gravito/ripple'
 *
 * const core = new PlanetCore()
 *
 * // Install Ripple as an Orbit
 * core.install(new OrbitRipple({
 *   path: '/ws',
 *   authorizer: async (channel, userId) => userId !== undefined
 * }))
 * ```
 */
export class OrbitRipple implements GravitoOrbit {
  private server: RippleServer
  private config: RippleConfig

  /**
   * Create a new OrbitRipple.
   *
   * @param config - Ripple configuration options
   */
  constructor(config: RippleConfig = {}) {
    this.config = config
    this.server = new RippleServer(config)
  }

  /**
   * Install the orbit into the Gravito core.
   *
   * - Registers 'ripple' (RippleServer) and 'broadcast' (BroadcastManager) in the container.
   * - Adds middleware to inject 'ripple' and 'broadcast' into GravitoContext.
   * - Integrates with BunNativeAdapter for same-port WebSocket support.
   * - Initializes the server and registers shutdown hooks.
   *
   * @param core - The PlanetCore instance
   */
  install(core: PlanetCore): void {
    core.logger.info('🌊 Orbit Ripple installed')

    // Set static reference for helper functions
    setRippleServer(this.server)

    // Register in IoC container
    core.container.instance('ripple', this.server)

    const broadcastManager = new BroadcastManager(this.server)
    core.container.instance('broadcast', broadcastManager)

    // Middleware to inject into context
    core.adapter.use('*', async (ctx: GravitoContext, next: GravitoNext) => {
      ctx.set('ripple', this.server)
      ctx.set('broadcast', broadcastManager)
      return await next()
    })

    // Initialize driver and integrate with adapter
    this.server.initDriver().then(async () => {
      const path = this.config.path || '/ws'

      // Check if adapter supports WebSocket routes (BunNativeAdapter)
      if (
        'registerWebSocketRoute' in core.adapter &&
        typeof (core.adapter as any).registerWebSocketRoute === 'function'
      ) {
        const wsConfig = this.server.getWebSocketConfig()
        ;(core.adapter as any).registerWebSocketRoute(path, wsConfig)
        core.logger.info(`🌊 Ripple ready at ws://[host]${path} (shared port with HTTP)`)
      } else {
        // Fallback: Start WebSocket on separate port for non-BunNativeAdapter
        const wsPort = (this.config as any).port || 6001
        await this.server.start(wsPort)
        core.logger.info(`🌊 Ripple ready at ws://localhost:${wsPort}${path} (separate port)`)
      }
    })

    // Lifecycle: Graceful shutdown
    core.hooks.doAction('core:shutdown', async () => {
      await this.server.shutdown()
    })
  }

  /**
   * Get the underlying RippleServer instance.
   *
   * @returns The RippleServer instance
   */
  getServer(): RippleServer {
    return this.server
  }

  /**
   * Get the WebSocket handler for Bun.serve.
   *
   * @returns The WebSocket handler object
   */
  getHandler() {
    return this.server.getHandler()
  }
}

declare module '@gravito/core' {
  interface GravitoVariables {
    /** RippleServer instance available in context */
    ripple?: RippleServer
    /** BroadcastManager instance available in context */
    broadcast?: BroadcastManager
  }
}
