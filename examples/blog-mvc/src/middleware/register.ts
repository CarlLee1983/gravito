import type { PlanetCore } from '@gravito/core'
import { bodySizeLimit, securityHeaders } from '@gravito/photon/middleware/security'
import { getSecurityConfig } from '../config/security'
import { handleInertiaRequests } from './HandleInertiaRequests'

export function registerGlobalMiddleware(core: PlanetCore) {
  const isDev = process.env.NODE_ENV !== 'production'

  // 1. Security Headers
  core.adapter.use('*', securityHeaders(getSecurityConfig(isDev)))

  // 2. Body Parser Limits
  core.adapter.use('*', bodySizeLimit(50 * 1024 * 1024)) // 50MB limit

  // 3. Application Middleware
  core.adapter.use('*', handleInertiaRequests)
}
