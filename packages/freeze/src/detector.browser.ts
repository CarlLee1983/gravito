import { FreezeDetector } from './detector.universal'
import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath } from './types'

export class BrowserFreezeDetector extends FreezeDetector {
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

    if (this.config.staticDomains.includes(hostname)) {
      return true
    }

    return this.config.staticPatterns.some((pattern) => hostname.endsWith(pattern))
  }

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
