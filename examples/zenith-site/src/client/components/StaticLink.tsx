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

  // 支援子網域匹配 (例如 zenith.gravito.dev)
  const staticDomains = ['gravito.dev', 'github.io', 'vercel.app', 'netlify.app', 'pages.dev']
  return staticDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  )
}

/**
 * 獲獲取當前語系
 */
export function getCurrentLocale(): string {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const pathname = window.location.pathname
  if (pathname.startsWith('/zh-TW/') || pathname === '/zh-TW') {
    return 'zh-TW'
  }

  return 'en'
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
  locale?: string // 新增：可選語系覆寫
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  [key: string]: unknown
}

export function StaticLink({
  href,
  locale: forcedLocale,
  children,
  className,
  onClick,
  ...props
}: StaticLinkProps) {
  const isStatic = isStaticSite()
  const basePath = getBasePath()
  const currentLocale = getCurrentLocale()

  // 決定目標語系：如果有傳入則用傳入的，否則用當前的
  const targetLocale = forcedLocale || currentLocale

  // 處理路徑
  let processedHref = href || ''

  // 1. 如果是絕對路徑，先移除現有的語系前綴（以便重新套用）
  if (processedHref.startsWith('/zh-TW/') || processedHref === '/zh-TW') {
    processedHref = processedHref === '/zh-TW' ? '/' : processedHref.replace('/zh-TW', '')
  }

  // 2. 套用目標語系前綴（en 是預設，不加前綴）
  if (targetLocale === 'zh-TW') {
    processedHref = processedHref === '/' ? '/zh-TW' : `/zh-TW${processedHref}`
  }

  // 3. 處理基礎路徑 (GitHub Pages 等)
  const finalHref =
    processedHref.startsWith('/') && !processedHref.startsWith(`${basePath}/`)
      ? `${basePath}${processedHref}`
      : processedHref

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
      {children as any}
    </Link>
  )
}
