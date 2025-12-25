import { Link } from '@inertiajs/react'
import type React from 'react'

/**
 * 檢測是否在靜態網站環境中（GitHub Pages、Vercel、Netlify 等）
 * 在靜態環境中，沒有後端伺服器處理 Inertia 的 AJAX 請求，
 * 因此需要使用普通的 <a> 標籤進行完整頁面導航
 *
 * 注意：請根據您的實際生產環境域名更新 staticDomains 陣列
 */
/**
 * 檢測是否在靜態網站環境中
 */
export function isStaticSite(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname
  const port = window.location.port

  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '4173') {
    return true
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false
  }

  const staticDomains = ['gravito.dev', 'gravito-framework.github.io']
  return staticDomains.includes(hostname)
}

/**
 * 獲取基礎路徑（用於 GitHub Pages 子目錄等環境）
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const pathname = window.location.pathname
  // 如果在 GitHub Pages 子路徑中
  if (pathname.startsWith('/gravito/')) {
    return '/gravito'
  }

  return ''
}

interface StaticLinkProps {
  href: string | undefined | null
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  [key: string]: unknown
}

export function StaticLink({ href, children, className, onClick, ...props }: StaticLinkProps) {
  const isStatic = isStaticSite()
  const basePath = getBasePath()

  // 處理路徑前綴
  const finalHref =
    href?.startsWith('/') && !href.startsWith(`${basePath}/`) ? `${basePath}${href}` : href

  if (isStatic) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick(e)
      }
    }

    return (
      <a
        href={finalHref as string}
        className={className}
        onClick={handleClick}
        {...(props as Omit<
          React.AnchorHTMLAttributes<HTMLAnchorElement>,
          'href' | 'className' | 'onClick'
        >)}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={finalHref || ''} className={className} onClick={onClick as any} {...props}>
      {children}
    </Link>
  )
}
