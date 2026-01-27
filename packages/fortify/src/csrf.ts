import type { CsrfOptions, GravitoContext } from '@gravito/core'
import { getCsrfToken } from '@gravito/core'
import type { FortifyConfig } from './config'

/**
 * Resolve CSRF options from Fortify configuration.
 *
 * This helper normalizes the CSRF configuration, supporting boolean toggles
 * or detailed configuration objects.
 *
 * @param config - The Fortify configuration object.
 * @returns CSRF options if enabled, or `null` if explicitly disabled.
 *
 * @public
 * @since 3.0.0
 */
export function resolveCsrfOptions(config: FortifyConfig): CsrfOptions | null {
  if (config.csrf === false) {
    return null
  }
  if (typeof config.csrf === 'object') {
    return config.csrf
  }
  return {}
}

/**
 * Ensure a CSRF token is present in the context and return it.
 *
 * If CSRF is enabled in the configuration, this will either retrieve the existing
 * token or generate a new one if it doesn't exist.
 *
 * @param c - The Gravito request context.
 * @param config - The Fortify configuration object.
 * @returns The CSRF token string, or `null` if CSRF is disabled.
 *
 * @public
 * @since 3.0.0
 */
export function ensureCsrfToken(c: GravitoContext, config: FortifyConfig): string | null {
  const options = resolveCsrfOptions(config)
  if (!options) {
    return null
  }
  return getCsrfToken(c, options)
}
