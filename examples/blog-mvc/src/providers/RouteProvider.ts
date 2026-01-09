/**
 * Route Service Provider
 *
 * Registers application routes.
 * Routes are registered in the boot phase after all services are available.
 *
 * Lifecycle:
 * - register(): N/A
 * - boot(): Register routes
 */

import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { registerRoutes } from '../routes/index'

export class RouteProvider extends ServiceProvider {
  /**
   * No container bindings needed.
   */
  register(_container: Container): void {
    // Routes don't require container bindings
  }

  /**
   * Register application routes.
   */
  async boot(core: PlanetCore): Promise<void> {
    await registerRoutes(core)
    core.logger.info('🛤️ Routes registered')
  }
}
