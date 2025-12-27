import { Link } from '@inertiajs/react'
import type { AnchorHTMLAttributes, ComponentProps, MouseEvent } from 'react'

type InertiaLinkProps = ComponentProps<typeof Link>

/**
 * 檢測是否在靜態網站環境中（GitHub Pages、Vercel、Netlify 等）
 * 在靜態環境中，沒有後端伺服器處理 Inertia 的 AJAX 請求，
 * 因此需要使用普通的 <a> 標籤進行完整頁面導航
 *
 * 從環境變數 STATIC_SITE_DOMAINS 讀取生產環境域名列表
 */
function isStaticSite(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname

  // 從環境變數讀取靜態網站域名列表
  // 在 Vite 中，環境變數需要以 VITE_ 開頭才能在客戶端訪問
  // 但我們可以在建置時注入，或使用 import.meta.env
  const staticDomainsEnv = import.meta.env.VITE_STATIC_SITE_DOMAINS || ''
  const staticDomains = staticDomainsEnv
    .split(',')
    .map((d: string) => d.trim())
    .filter((d: string) => d.length > 0)

  // 如果沒有配置環境變數，檢查常見的靜態託管域名模式
  if (staticDomains.length === 0) {
    // 常見的靜態託管平台域名模式
    return (
      hostname.includes('github.io') ||
      hostname.includes('vercel.app') ||
      hostname.includes('netlify.app') ||
      hostname.includes('pages.dev')
    )
  }

  return staticDomains.includes(hostname)
}

type LinkChildren = ComponentProps<typeof Link>['children']

type StaticLinkProps = Omit<InertiaLinkProps, 'children'> & {
  children?: LinkChildren
  className?: string
}

/**
 * 自定義 Link 組件，在靜態網站環境中使用普通的 <a> 標籤
 * 在開發環境或動態環境中使用 Inertia 的 Link 組件
 *
 * 使用方式：
 * ```tsx
 * import { StaticLink } from '@/components/StaticLink'
 * <StaticLink href="/about">About</StaticLink>
 * ```
 */
export function StaticLink({ href, children, className, onClick, ...props }: StaticLinkProps) {
  const isStatic = isStaticSite()

  if (isStatic) {
    // 在靜態環境中，使用普通的 <a> 標籤進行完整頁面導航
    // 這樣可以避免 Inertia 的 AJAX 請求在沒有後端的情況下失敗
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // 如果提供了 onClick 處理器，先執行它
      if (onClick) {
        ;(onClick as (e: MouseEvent<HTMLAnchorElement>) => void)(e)
      }
      // 在靜態環境中，讓瀏覽器處理導航（不阻止默認行為）
    }

    return (
      <a
        href={href as string}
        className={className}
        onClick={handleClick}
        {...(props as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'onClick'>)}
      >
        {children}
      </a>
    )
  }

  // 在動態環境中，使用 Inertia 的 Link 組件
  return (
    <Link href={href} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  )
}
