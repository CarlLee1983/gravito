/**
 * @gravito/freeze-react
 *
 * React adapter for @gravito/freeze SSG module.
 *
 * This package provides React components and hooks for building
 * static sites with Gravito Framework.
 *
 * @example
 * ```tsx
 * import {
 *   FreezeProvider,
 *   useFreeze,
 *   StaticLink,
 *   LocaleSwitcher,
 * } from '@gravito/freeze-react'
 * import { defineConfig } from '@gravito/freeze'
 *
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   locales: ['en', 'zh'],
 *   defaultLocale: 'en',
 *   baseUrl: 'https://example.com',
 * })
 *
 * function App() {
 *   return (
 *     <FreezeProvider config={config}>
 *       <Navigation />
 *     </FreezeProvider>
 *   )
 * }
 *
 * function Navigation() {
 *   const { isStatic, locale } = useFreeze()
 *
 *   return (
 *     <nav>
 *       <StaticLink href="/about">About</StaticLink>
 *       <LocaleSwitcher locale="en">EN</LocaleSwitcher>
 *       <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
 *     </nav>
 *   )
 * }
 * ```
 *
 * @packageDocumentation
 */

export * from '@gravito/freeze'
export type { LocaleSwitcherProps, StaticLinkProps } from './components'
// Components
export { LocaleSwitcher, StaticLink } from './components'
export type { FreezeContextValue, FreezeProviderProps } from './provider'
// Provider
export { FreezeProvider } from './provider'
export type { UseFreezeReturn } from './use-freeze'
// Hook
export { useFreeze } from './use-freeze'
