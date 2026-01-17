import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { setRippleServer } from './events/Broadcaster'
import { RippleServer } from './RippleServer'
import type { RippleConfig } from './types'

/**
 * OrbitRipple provides native WebSocket support for Gravito.
 * it manages the RippleServer lifecycle, integrates with the core event system,
 * and provides a request-scoped server instance.
 *
 * @example
 * ```typescript
 * const ripple = new OrbitRipple({ path: '/realtime' });
 * core.addOrbit(ripple);
 * ```
 * @public
 */
export class OrbitRipple implements GravitoOrbit {
  private server: RippleServer
  private config: RippleConfig

  /**
   * Create a new OrbitRipple instance.
   * @param config - Configuration options for the WebSocket server.
   */
  constructor(config: RippleConfig = {}) {
    this.config = config
    this.server = new RippleServer(config)
  }

  /**
   * Install the module into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('🌊 Orbit Ripple installed')

    // Store reference globally for broadcast() function
    setRippleServer(this.server)

    // Register in core container for global access (CLI, Jobs)
    core.container.instance('ripple', this.server)

    // Expose Ripple server via context variable
    core.adapter.use('*', async (ctx: GravitoContext, next: GravitoNext) => {
      ctx.set('ripple' as any, this.server)
      return await next()
    })

    // Initialize server immediately
    this.server.init().then(() => {
      core.logger.info(`🌊 Ripple WebSocket ready at ${this.config.path || '/ws'}`)
    })

    // Register shutdown hook
    core.hooks.doAction('core:shutdown', async () => {
      await this.server.shutdown()
    })
  }

  /**
   * Get the underlying RippleServer instance
   */
  getServer(): RippleServer {
    return this.server
  }

  /**
   * Get WebSocket handler for Bun.serve integration
   */
  getHandler() {
    return this.server.getHandler()
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Ripple WebSocket server */
    ripple?: RippleServer
  }
}
