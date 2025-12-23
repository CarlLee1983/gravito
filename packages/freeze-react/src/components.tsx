/**
 * @gravito/freeze-react - StaticLink Component
 *
 * Smart link component that uses native <a> for static sites
 * and Inertia Link for dynamic SSR mode.
 */

import type { ReactNode } from 'react'
import { useFreeze } from './use-freeze'

/**
 * Try to import Inertia Link, fallback to null if not available
 */
let InertiaLink: React.ComponentType<{
  href: string
  className?: string
  children?: ReactNode
  [key: string]: unknown
}> | null = null

try {
  // Dynamic import check - will be tree-shaken in production
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const inertia = require('@inertiajs/react')
  InertiaLink = inertia.Link
} catch {
  // Inertia not installed, will use native <a> tags
}

/**
 * Props for StaticLink component
 */
export interface StaticLinkProps {
  /** Target URL path (will be localized automatically) */
  href: string
  /** CSS class name */
  className?: string
  /** Child elements */
  children: ReactNode
  /** Whether to skip localization */
  skipLocalization?: boolean
  /** Additional props passed to anchor/Link */
  [key: string]: unknown
}

/**
 * Smart link component for SSG sites.
 *
 * Automatically detects the environment:
 * - In static mode: Uses native `<a>` tags for full page navigation.
 * - In SSR mode: Uses Inertia `Link` for SPA navigation (if available).
 *
 * It also automatically localizes the `href` based on the current locale
 * unless `skipLocalization` is set to true.
 *
 * @param props - Component properties.
 * @returns A React element (either `<a>` or Inertia `Link`).
 *
 * @example
 * ```tsx
 * import { StaticLink } from '@gravito/freeze-react'
 *
 * function Navigation() {
 *   return (
 *     <nav>
 *       <StaticLink href="/about">About</StaticLink>
 *       <StaticLink href="/docs/guide">Guide</StaticLink>
 *     </nav>
 *   )
 * }
 * ```
 */
export function StaticLink({
  href,
  children,
  className,
  skipLocalization = false,
  ...props
}: StaticLinkProps) {
  const { isStatic, getLocalizedPath } = useFreeze()

  // Localize the path unless explicitly skipped
  const finalHref = skipLocalization ? href : getLocalizedPath(href)

  // In static mode or if Inertia is not available, use native <a>
  if (isStatic || !InertiaLink) {
    return (
      <a href={finalHref} className={className} {...props}>
        {children}
      </a>
    )
  }

  // In SSR mode with Inertia, use Link component
  return (
    <InertiaLink href={finalHref} className={className} {...props}>
      {children}
    </InertiaLink>
  )
}

/**
 * Props for LocaleSwitcher component.
 */
export interface LocaleSwitcherProps {
  /** Locale to switch to (e.g., 'en', 'zh') */
  locale: string
  /** CSS class name */
  className?: string
  /** Optional custom content, defaults to uppercase locale code */
  children?: ReactNode
  /** Additional props passed to the anchor tag */
  [key: string]: unknown
}

/**
 * Locale switcher link component.
 *
 * Renders an `<a>` tag that switches the site's locale while preserving
 * the current path.
 *
 * @param props - Component properties.
 * @returns A React element (`<a>`).
 *
 * @example
 * ```tsx
 * import { LocaleSwitcher } from '@gravito/freeze-react'
 *
 * function Header() {
 *   return (
 *     <div>
 *       <LocaleSwitcher locale="en">English</LocaleSwitcher>
 *       <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
 *     </div>
 *   )
 * }
 * ```
 */
export function LocaleSwitcher({ locale, className, children, ...props }: LocaleSwitcherProps) {
  const { switchLocale, locale: currentLocale } = useFreeze()

  const targetPath = switchLocale(locale)
  const isActive = currentLocale === locale

  return (
    <a
      href={targetPath}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    >
      {children ?? locale.toUpperCase()}
    </a>
  )
}
