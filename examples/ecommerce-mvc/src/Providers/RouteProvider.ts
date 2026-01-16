/**
 * Route Provider
 *
 * Registers application routes.
 */

import { type PlanetCore, ServiceProvider } from '@gravito/core'
import { registerRoutes } from '../routes'

export class RouteProvider extends ServiceProvider {
  register() {
    // Routes are registered in boot phase
  }

  boot(core: PlanetCore) {
    registerRoutes(core.router)
  }
}
