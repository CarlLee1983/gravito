import type { GravitoContext, GravitoMiddleware } from '@gravito/core'
import type { SecurityHeadersConfig } from '../config'

export function securityHeaders(config: SecurityHeadersConfig): GravitoMiddleware {
  return async (c: GravitoContext, next) => {
    if (config.hsts?.enabled) {
      let hstsValue = `max-age=${config.hsts.maxAge}`
      if (config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains'
      }
      if (config.hsts.preload) {
        hstsValue += '; preload'
      }
      c.header('Strict-Transport-Security', hstsValue)
    }

    if (config.noSniff) {
      c.header('X-Content-Type-Options', 'nosniff')
    }

    if (config.frameOptions) {
      c.header('X-Frame-Options', config.frameOptions)
    }

    if (config.xssProtection) {
      c.header('X-XSS-Protection', config.xssProtection)
    }

    if (config.csp?.enabled && config.csp.directives) {
      const toKebabCase = (str: string) => str.replace(/([A-Z])/g, '-$1').toLowerCase()
      const cspDirectives = Object.entries(config.csp.directives)
        .map(([key, values]) => `${toKebabCase(key)} ${values.join(' ')}`)
        .join('; ')
      c.header('Content-Security-Policy', cspDirectives)
    }

    return await next()
  }
}
