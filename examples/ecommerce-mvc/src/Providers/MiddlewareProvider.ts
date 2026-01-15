/**
 * Middleware Provider
 *
 * Registers global middleware for security and request handling.
 */

import { bodySizeLimit, ServiceProvider, securityHeaders } from '@gravito/core'
import { securityConfig } from '../../config/security'
import { HandleInertiaRequests } from '../Http/Middleware'

export class MiddlewareProvider extends ServiceProvider {
  register() {
    // Middleware is registered in boot phase
  }

  boot() {
    this.registerSecurityMiddleware()
    this.registerBodyLimitMiddleware()
    this.registerInertiaMiddleware()
  }

  private registerSecurityMiddleware() {
    const { csp, hsts } = securityConfig

    this.core?.adapter.use(
      '*',
      securityHeaders({
        contentSecurityPolicy: csp.enabled ? csp.default : false,
        hsts: hsts.enabled
          ? { maxAge: hsts.maxAge, includeSubDomains: hsts.includeSubDomains }
          : false,
      })
    )
  }

  private registerBodyLimitMiddleware() {
    const { maxSize, requireContentLength } = securityConfig.bodyLimit

    if (!Number.isNaN(maxSize) && maxSize > 0) {
      this.core?.adapter.use('*', bodySizeLimit(maxSize, { requireContentLength }))
    }
  }

  private registerInertiaMiddleware() {
    // Register Inertia shared data middleware
    this.core?.adapter.use('*', HandleInertiaRequests)
  }
}
