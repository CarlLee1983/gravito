import type { FreezeConfig } from './config'
import { BrowserFreezeDetector } from './detector.browser'
import { FreezeDetector } from './detector.universal'

export type { RedirectInfo } from './detector.universal'
export { FreezeDetector } from './detector.universal'

/**
 * Creates a FreezeDetector instance appropriate for the current environment.
 *
 * Automatically selects between {@link BrowserFreezeDetector} (when `window`
 * is available) and {@link FreezeDetector} (universal fallback) to enable
 * isomorphic code that works in both browser and server environments.
 *
 * @param config - The freeze configuration
 * @returns A detector instance optimized for the current environment
 *
 * @example
 * ```typescript
 * // Works in both browser and Node.js
 * const detector = createDetector(config)
 *
 * // In browser: returns BrowserFreezeDetector with DOM detection
 * // In Node.js: returns FreezeDetector (base class)
 *
 * // Use detector methods universally
 * const locale = detector.getLocaleFromPath('/en/docs')
 * const localized = detector.getLocalizedPath('/about', 'zh')
 * ```
 *
 * @example
 * ```typescript
 * // React component using detector
 * function LanguageSwitcher() {
 *   const detector = createDetector(config)
 *   const current Locale = detector.getCurrentLocale()
 *
 *   const switchTo = (newLocale: string) => {
 *     const newPath = detector.switchLocale(window.location.pathname, newLocale)
 *     if (detector.isStaticSite()) {
 *       // Static: native navigation
 *       window.location.href = newPath
 *     } else {
 *       // Dynamic: framework router
 *       router.push(newPath)
 *     }
 *   }
 *
 *   return <button onClick={() => switchTo('zh')}>中文</button>
 * }
 * ```
 */
export function createDetector(config: FreezeConfig): FreezeDetector {
  if (typeof window !== 'undefined') {
    return new BrowserFreezeDetector(config)
  }
  return new FreezeDetector(config)
}
