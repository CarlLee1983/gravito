/**
 * 全局測試設置
 * 配置 Vitest 環境
 */

// 配置 fetch 的基址 URL（用於整合測試）
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// 如果有 globalThis.fetch，修補它以使用基址 URL
if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
  const originalFetch = globalThis.fetch

  globalThis.fetch = ((url: string | Request, init?: RequestInit) => {
    // 如果 URL 是相對路徑，添加基址
    if (typeof url === 'string' && !url.startsWith('http')) {
      const fullUrl = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
      return originalFetch(fullUrl, init)
    }
    return originalFetch(url, init)
  }) as typeof fetch
}
