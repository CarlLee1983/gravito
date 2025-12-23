/**
 * @gravito/freeze-react - Context Provider
 *
 * React Context for SSG configuration and detector.
 */

import { createDetector, type FreezeConfig, type FreezeDetector } from '@gravito/freeze'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

/**
 * Freeze Context value
 */
export interface FreezeContextValue {
  config: FreezeConfig
  detector: FreezeDetector
  currentLocale: string
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
  locale?: string
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
 * import { freezeConfig } from './freeze.config'
 *
 * function App() {
 *   return (
 *     <FreezeProvider config={freezeConfig} locale="en">
 *       <Layout>...</Layout>
 *     </FreezeProvider>
 *   )
 * }
 * ```
 */
export function FreezeProvider({ config, locale, children }: FreezeProviderProps) {
  const value = useMemo(() => {
    const detector = createDetector(config)
    const currentLocale = locale ?? detector.getCurrentLocale()

    return {
      config,
      detector,
      currentLocale,
    }
  }, [config, locale])

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
