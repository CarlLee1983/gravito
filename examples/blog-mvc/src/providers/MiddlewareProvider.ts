/**
 * Middleware Service Provider
 *
 * Registers global middleware stack.
 * Provides a centralized location for middleware configuration.
 *
 * Lifecycle:
 * - register(): N/A (no container bindings)
 * - boot(): Register global middleware
 */

import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { bodySizeLimit, securityHeaders } from '@gravito/photon/middleware/security'
import { getSecurityConfig } from '../config/security'
import { handleInertiaRequests } from '../middleware/HandleInertiaRequests'

export class MiddlewareProvider extends ServiceProvider {
  /**
   * No container bindings needed.
   */
  register(_container: Container): void {
    // Middleware doesn't require container bindings
  }

  /**
   * Register global middleware stack.
   */
  boot(core: PlanetCore): void {
    const isDev = process.env.NODE_ENV !== 'production'

    // 1. Security Headers
    core.adapter.use('*', securityHeaders(getSecurityConfig(isDev)))

    // 2. Body Parser Limits
    core.adapter.use('*', bodySizeLimit(50 * 1024 * 1024)) // 50MB limit

    // 3. Application Middleware
    core.adapter.use('*', handleInertiaRequests)

    core.logger.info('🛡️ Middleware registered')
  }
}
