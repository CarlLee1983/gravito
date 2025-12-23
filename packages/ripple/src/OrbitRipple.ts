/**
 * @fileoverview OrbitRipple - Gravito module wrapper for Ripple WebSocket
 *
 * Integrates RippleServer with Gravito's PlanetCore.
 *
 * @module @gravito/ripple
 */

import { setRippleServer } from './events/Broadcaster'
import { RippleServer } from './RippleServer'
import type { RippleConfig } from './types'

/**
 * PlanetCore interface for type safety without importing
 */
interface PlanetCore {
  logger: { info: (msg: string) => void }
  adapter: {
    use: (path: string, handler: (ctx: any, next: () => Promise<void>) => Promise<void>) => void
  }
  hooks: {
    addAction: (hook: string, callback: (args: unknown) => Promise<void>) => void
  }
}

/**
 * OrbitRipple - Gravito module for real-time WebSocket communication
 *
 * @example
 * ```typescript
 * import { OrbitRipple } from '@gravito/ripple'
 *
 * const core = new PlanetCore()
 *
 * core.install(new OrbitRipple({
 *   path: '/ws',
 *   authorizer: async (channel, userId, socketId) => {
 *     // Return true for authorized, false for denied
 *     // For presence channels, return { id: userId, info: { name: '...' } }
 *     return true
 *   }
 * }))
 *
 * // The WebSocket is automatically integrated with Bun.serve
 * core.boot()
 * ```
 */
export class OrbitRipple {
  private server: RippleServer
  private config: RippleConfig

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

    // Expose Ripple server via context variable
    core.adapter.use('*', async (ctx, next) => {
      ctx.set('ripple' as any, this.server)
      await next()
    })

    // Initialize server immediately
    this.server.init().then(() => {
      core.logger.info(`🌊 Ripple WebSocket ready at ${this.config.path || '/ws'}`)
    })

    // Register shutdown hook
    core.hooks.addAction('shutdown', async () => {
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
   *
   * @example
   * ```typescript
   * const ripple = new OrbitRipple()
   *
   * Bun.serve({
   *   fetch: (req, server) => {
   *     // Let Ripple handle WebSocket upgrades
   *     if (ripple.getServer().upgrade(req, server)) return
   *
   *     // Regular HTTP handling
   *     return core.adapter.fetch(req, server)
   *   },
   *   websocket: ripple.getHandler()
   * })
   * ```
   */
  getHandler() {
    return this.server.getHandler()
  }
}
