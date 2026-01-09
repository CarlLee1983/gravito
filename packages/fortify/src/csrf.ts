import type { CsrfOptions, GravitoContext } from '@gravito/core'
import { getCsrfToken } from '@gravito/core'
import type { FortifyConfig } from './config'

export function resolveCsrfOptions(config: FortifyConfig): CsrfOptions | null {
  if (config.csrf === false) {
    return null
  }
  if (typeof config.csrf === 'object') {
    return config.csrf
  }
  return {}
}

export function ensureCsrfToken(c: GravitoContext, config: FortifyConfig): string | null {
  const options = resolveCsrfOptions(config)
  if (!options) {
    return null
  }
  return getCsrfToken(c, options)
}
