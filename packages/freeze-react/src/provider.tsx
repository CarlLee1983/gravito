/**
 * @gravito/freeze-react - Context Provider
 *
 * React Context for SSG configuration and detector.
 */

import {
  asLocale,
  createDetector,
  type FreezeConfig,
  type FreezeDetector,
  type Locale,
} from '@gravito/freeze'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Freeze Context value
 */
export interface FreezeContextValue {
  config: FreezeConfig
  detector: FreezeDetector
  currentLocale: Locale
  /** Optional Inertia Link component */
  LinkComponent?: React.ComponentType<any>
}

/**
 * Internal context (not exported directly)
 */
const FreezeContext = createContext<FreezeContextValue | null>(null)

/**
 * Props for FreezeProvider
 */
export interface FreezeProviderProps {
  /** SSG configuration */
  config: FreezeConfig
  /** Current locale (from URL or state) */
  locale?: string | Locale
  /** Optional Inertia Link component to use in dynamic mode */
  LinkComponent?: React.ComponentType<any>
  /** Child components */
  children: ReactNode
}

/**
 * Provider component for SSG functionality.
 *
 * Wraps your application to provide Freeze configuration and detector
 * instances through context.
 *
 * @param props - Component properties.
 * @returns A React element provider.
 *
 * @example
 * ```tsx
 * import { FreezeProvider } from '@gravito/freeze-react'
 * import { Link } from '@inertiajs/react'
 * import { freezeConfig } from './freeze.config'
 *
 * function App() {
 *   return (
 *     <FreezeProvider config={freezeConfig} locale="en" LinkComponent={Link}>
 *       <Layout>...</Layout>
 *     </FreezeProvider>
 *   )
 * }
 * ```
 */
export function FreezeProvider({
  config,
  locale: forcedLocale,
  LinkComponent,
  children,
}: FreezeProviderProps) {
  const detector = useMemo(() => createDetector(config), [config])

  const [currentLocale, setCurrentLocale] = useState<Locale>(() =>
    forcedLocale ? asLocale(forcedLocale) : detector.getCurrentLocale()
  )

  useEffect(() => {
    if (forcedLocale !== undefined) {
      setCurrentLocale(asLocale(forcedLocale))
    }
  }, [forcedLocale])

  useEffect(() => {
    if (forcedLocale !== undefined || typeof window === 'undefined') {
      return
    }

    const handleLocationChange = () => {
      const detected = detector.getCurrentLocale()
      setCurrentLocale((prev) => (prev !== detected ? detected : prev))
    }

    window.addEventListener('popstate', handleLocationChange)

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args)
      handleLocationChange()
    }

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      handleLocationChange()
    }

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [detector, forcedLocale])

  const value = useMemo<FreezeContextValue>(() => {
    return {
      config,
      detector,
      currentLocale,
      LinkComponent,
    }
  }, [config, detector, currentLocale, LinkComponent])

  return <FreezeContext.Provider value={value}>{children}</FreezeContext.Provider>
}

/**
 * Internal hook to get context value.
 *
 * Throws an error if used outside of a `FreezeProvider`.
 *
 * @returns The current `FreezeContextValue`.
 * @throws {Error} If used outside of a `FreezeProvider`.
 */
export function useFreezeContext(): FreezeContextValue {
  const context = useContext(FreezeContext)
  if (!context) {
    throw new Error('useFreeze must be used within a FreezeProvider')
  }
  return context
}
