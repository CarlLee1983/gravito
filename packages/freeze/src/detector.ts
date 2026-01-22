import type { FreezeConfig } from './config'
import { BrowserFreezeDetector } from './detector.browser'
import { FreezeDetector } from './detector.universal'

export type { RedirectInfo } from './detector.universal'
export { FreezeDetector } from './detector.universal'

/**
 * Create a new FreezeDetector instance.
 *
 * @param config - The Freeze configuration.
 * @returns A new FreezeDetector instance.
 */
export function createDetector(config: FreezeConfig): FreezeDetector {
  if (typeof window !== 'undefined') {
    return new BrowserFreezeDetector(config)
  }
  return new FreezeDetector(config)
}
