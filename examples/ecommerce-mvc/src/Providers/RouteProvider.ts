/**
 * Route Provider
 *
 * Registers application routes.
 */

import { ServiceProvider } from '@gravito/core'
import { registerRoutes } from '../routes'

export class RouteProvider extends ServiceProvider {
  register() {
    // Routes are registered in boot phase
  }

  boot() {
    registerRoutes(this.core?.router)
  }
}
