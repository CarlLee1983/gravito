import type { FreezeConfig } from './config'
import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath } from './types'

export interface RedirectInfo {
  from: AbsolutePath
  to: AbsolutePath
}

export class FreezeDetector {
  protected localeRegexMap: Map<Locale, RegExp> = new Map()

  constructor(protected config: FreezeConfig) {
    for (const locale of config.locales) {
      this.localeRegexMap.set(locale, new RegExp(`^/${locale}(/|$)`))
    }
  }

  isStaticSite(): boolean {
    return false
  }

  getLocaleFromPath(path: string | AbsolutePath): Locale {
    for (const [locale, regex] of this.localeRegexMap) {
      if (regex.test(path)) {
        return locale
      }
    }
    return this.config.defaultLocale
  }

  getLocalizedPath(path: string | AbsolutePath, locale: string | Locale): AbsolutePath {
    let cleanPath = path

    for (const regex of this.localeRegexMap.values()) {
      if (regex.test(cleanPath)) {
        cleanPath = cleanPath.replace(regex, '/')
        break
      }
    }

    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1)
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`
    }

    if (locale === this.config.defaultLocale) {
      return asAbsolutePath(cleanPath)
    }

    return asAbsolutePath(cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`)
  }

  switchLocale(currentPath: string | AbsolutePath, newLocale: string | Locale): AbsolutePath {
    return this.getLocalizedPath(currentPath, newLocale)
  }

  needsRedirect(path: string): RedirectInfo | null {
    for (const rule of this.config.redirects) {
      if (path === rule.from || path === `${rule.from}/`) {
        return {
          from: rule.from,
          to: rule.to,
        }
      }
    }
    return null
  }

  getCurrentLocale(): Locale {
    return this.config.defaultLocale
  }
}
