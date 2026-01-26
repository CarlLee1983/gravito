import { FreezeDetector } from './detector.universal'
import type { Locale } from './types'
import { asAbsolutePath } from './types'

/**
 * Browser-specific environment detector with DOM-based static site detection.
 *
 * Extends {@link FreezeDetector} with browser-specific functionality:
 * - Detects static hosting based on `window.location.hostname`
 * - Supports local preview mode detection via port matching
 * - Extracts current locale from URL path or `?lang=` query parameter
 *
 * @remarks
 * This class should only be instantiated in browser environments where
 * `window` is available. For universal code, use {@link createDetector}
 * which automatically selects the appropriate detector class.
 *
 * @example
 * ```typescript
 * // Browser environment
 * const detector = new BrowserFreezeDetector(config)
 *
 * // Check if on static hosting (GitHub Pages, Vercel, etc.)
 * if (detector.isStaticSite()) {
 *   // Use native <a> tags for navigation
 * } else {
 *   // Use framework router (Inertia, React Router, etc.)
 * }
 *
 * // Get current locale from URL
 * const locale = detector.getCurrentLocale() // From path or ?lang=
 * ```
 */
export class BrowserFreezeDetector extends FreezeDetector {
  /**
   * Detects if running on a static hosting platform.
   *
   * Detection logic (in priority order):
   * 1. **Local preview**: Returns `true` if on `localhost:<previewPort>`
   * 2. **Local development**: Returns `false` if on localhost (other ports)
   * 3. **Configured domains**: Returns `true` if hostname matches `staticDomains`
   * 4. **Platform patterns**: Returns `true` if hostname ends with known static hosting patterns
   *
   * @returns `true` if static site, `false` if dynamic
   *
   * @example
   * ```typescript
   * // On GitHub Pages (example.github.io)
   * detector.isStaticSite() // true
   *
   * // On localhost:4173 (preview port)
   * detector.isStaticSite() // true
   *
   * // On localhost:3000 (dev server)
   * detector.isStaticSite() // false
   *
   * // On production domain (example.com with dynamic backend)
   * detector.isStaticSite() // false
   * ```
   */
  isStaticSite(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    const hostname = window.location.hostname
    const port = window.location.port

    if (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      port === String(this.config.previewPort)
    ) {
      return true
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false
    }

    if (
      this.config.staticDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      )
    ) {
      return true
    }

    return this.config.staticPatterns.some((pattern) => hostname.endsWith(pattern))
  }

  /**
   * Gets the current locale from the browser environment.
   *
   * Extraction priority:
   * 1. **Query parameter**: Checks `?lang=<locale>` in the URL
   * 2. **Path prefix**: Extracts locale from `window.location.pathname`
   * 3. **Default**: Falls back to `config.defaultLocale`
   *
   * @returns The current locale identifier
   *
   * @example
   * ```typescript
   * // URL: https://example.com/en/docs
   * detector.getCurrentLocale() // 'en'
   *
   * // URL: https://example.com/zh/about
   * detector.getCurrentLocale() // 'zh'
   *
   * // URL: https://example.com/docs?lang=zh
   * detector.getCurrentLocale() // 'zh' (query param takes priority)
   *
   * // URL: https://example.com/docs (no locale)
   * detector.getCurrentLocale() // 'en' (default)
   * ```
   */
  getCurrentLocale(): Locale {
    if (typeof window === 'undefined') {
      return this.config.defaultLocale
    }

    const params = new URLSearchParams(window.location.search)
    const lang = params.get('lang')
    if (lang && this.config.locales.includes(lang as Locale)) {
      return lang as Locale
    }

    return this.getLocaleFromPath(asAbsolutePath(window.location.pathname))
  }
}
