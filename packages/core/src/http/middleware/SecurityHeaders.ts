import type { GravitoContext, GravitoMiddleware } from '../types'

export type HstsOptions = {
  maxAge: number
  includeSubDomains?: boolean
  preload?: boolean
}

export type SecurityHeadersOptions = {
  contentSecurityPolicy?: string | false | ((c: GravitoContext) => string | false)
  frameOptions?: string | false
  referrerPolicy?: string | false
  noSniff?: boolean
  hsts?: HstsOptions | false
  permissionsPolicy?: string | false
  crossOriginOpenerPolicy?: string | false
  crossOriginResourcePolicy?: string | false
}

function canSetHeader(c: GravitoContext): boolean {
  return typeof (c as { header?: unknown }).header === 'function'
}

function setHeader(c: GravitoContext, name: string, value: string) {
  if (!canSetHeader(c)) {
    return
  }
  c.header(name, value)
}

function buildHstsHeader(options: HstsOptions): string {
  const parts = [`max-age=${Math.max(0, options.maxAge)}`]
  if (options.includeSubDomains) {
    parts.push('includeSubDomains')
  }
  if (options.preload) {
    parts.push('preload')
  }
  return parts.join('; ')
}

export function securityHeaders(options: SecurityHeadersOptions = {}): GravitoMiddleware {
  const defaults: Required<Omit<SecurityHeadersOptions, 'contentSecurityPolicy' | 'hsts'>> = {
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    noSniff: true,
    permissionsPolicy: false,
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-site',
  }

  const merged = {
    ...defaults,
    ...options,
  }

  return async (c, next) => {
    if (merged.noSniff) {
      setHeader(c, 'X-Content-Type-Options', 'nosniff')
    }
    if (merged.frameOptions) {
      setHeader(c, 'X-Frame-Options', merged.frameOptions)
    }
    if (merged.referrerPolicy) {
      setHeader(c, 'Referrer-Policy', merged.referrerPolicy)
    }
    if (merged.permissionsPolicy) {
      setHeader(c, 'Permissions-Policy', merged.permissionsPolicy)
    }
    if (merged.crossOriginOpenerPolicy) {
      setHeader(c, 'Cross-Origin-Opener-Policy', merged.crossOriginOpenerPolicy)
    }
    if (merged.crossOriginResourcePolicy) {
      setHeader(c, 'Cross-Origin-Resource-Policy', merged.crossOriginResourcePolicy)
    }
    const cspValue =
      typeof merged.contentSecurityPolicy === 'function'
        ? merged.contentSecurityPolicy(c)
        : merged.contentSecurityPolicy
    if (cspValue) {
      setHeader(c, 'Content-Security-Policy', cspValue)
    }
    if (merged.hsts) {
      setHeader(c, 'Strict-Transport-Security', buildHstsHeader(merged.hsts))
    }

    await next()
    return undefined
  }
}
