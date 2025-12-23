/**
 * @gravito/freeze-react - useFreeze Hook
 *
 * React hook for accessing SSG utilities.
 */

import { useCallback } from 'react'
import { useFreezeContext } from './provider'

/**
 * Hook return type
 */
export interface UseFreezeReturn {
  /** Whether currently in static site mode */
  isStatic: boolean
  /** Current locale */
  locale: string
  /** Get localized path */
  getLocalizedPath: (path: string, locale?: string) => string
  /** Switch locale while preserving path */
  switchLocale: (newLocale: string) => string
  /** Get current path locale */
  getLocaleFromPath: (path: string) => string
  /** Navigate to a different locale */
  navigateToLocale: (newLocale: string) => void
}

/**
 * Hook for accessing SSG utilities in React components.
 *
 * Provides functions for path localization, locale switching, and
 * environment detection.
 *
 * @returns An object containing SSG utilities.
 *
 * @example
 * ```tsx
 * import { useFreeze } from '@gravito/freeze-react'
 *
 * function Navigation() {
 *   const { isStatic, locale, getLocalizedPath, navigateToLocale } = useFreeze()
 *
 *   return (
 *     <nav>
 *       <a href={getLocalizedPath('/about')}>About</a>
 *       <button onClick={() => navigateToLocale('zh')}>中文</button>
 *     </nav>
 *   )
 * }
 * ```
 */
export function useFreeze(): UseFreezeReturn {
  const { detector, currentLocale } = useFreezeContext()

  const isStatic = detector.isStaticSite()

  const getLocalizedPath = useCallback(
    (path: string, locale?: string) => {
      return detector.getLocalizedPath(path, locale ?? currentLocale)
    },
    [detector, currentLocale]
  )

  const switchLocale = useCallback(
    (newLocale: string) => {
      if (typeof window === 'undefined') {
        return `/${newLocale}`
      }
      return detector.switchLocale(window.location.pathname, newLocale)
    },
    [detector]
  )

  const getLocaleFromPath = useCallback(
    (path: string) => {
      return detector.getLocaleFromPath(path)
    },
    [detector]
  )

  const navigateToLocale = useCallback(
    (newLocale: string) => {
      if (typeof window !== 'undefined') {
        const newPath = switchLocale(newLocale)
        window.location.href = newPath
      }
    },
    [switchLocale]
  )

  return {
    isStatic,
    locale: currentLocale,
    getLocalizedPath,
    switchLocale,
    getLocaleFromPath,
    navigateToLocale,
  }
}
