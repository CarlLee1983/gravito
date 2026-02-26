/**
 * @file packages/cosmos/src/loaders/RemoteLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 從遠端 HTTP API 載入翻譯資源的實現
 */

import type { TranslationMap } from '../I18nService'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * 遠端載入器配置
 *
 * @public
 * @since 3.1.0
 */
export interface RemoteLoaderConfig extends LoaderConfig {
  /**
   * 遠端 API 的 URL 模板
   *
   * 使用 `:locale` 作為語言代碼的佔位符
   *
   * @example 'https://cms.example.com/i18n/:locale'
   */
  url: string

  /**
   * HTTP 請求標頭
   *
   * @example { 'Authorization': 'Bearer token', 'Accept': 'application/json' }
   */
  headers?: Record<string, string>

  /**
   * 請求超時時間 (毫秒)
   *
   * @default 10000 (10 秒)
   */
  timeout?: number

  /**
   * 重試次數
   *
   * @default 3
   */
  retries?: number

  /**
   * 重試延遲 (毫秒)
   *
   * 使用指數退避策略: delay * (2 ^ attempt)
   *
   * @default 1000 (1 秒)
   */
  retryDelay?: number

  /**
   * 是否啟用 ETag 快取
   *
   * 啟用後,會在後續請求中發送 If-None-Match 標頭
   * 如果伺服器返回 304 Not Modified,則使用快取的翻譯
   *
   * @default true
   */
  etagCache?: boolean
}

/**
 * 遠端翻譯載入器
 *
 * 從遠端 HTTP API 載入翻譯資源
 * 支援 ETag 快取、重試機制、超時處理
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const loader = new RemoteLoader({
 *   url: 'https://api.example.com/i18n/:locale',
 *   headers: { 'Authorization': 'Bearer your-token' },
 *   timeout: 5000,
 *   retries: 3,
 *   etagCache: true
 * })
 *
 * const translations = await loader.load('zh-TW')
 * // GET https://api.example.com/i18n/zh-TW
 * ```
 */
export class RemoteLoader implements TranslationLoaderChain {
  public readonly name: string
  private url: string
  private headers: Record<string, string>
  private timeout: number
  private retries: number
  private retryDelay: number
  private etagCache: boolean
  private fallbackLoader?: TranslationLoader

  /** ETag 快取:locale -> etag */
  private etagMap = new Map<string, string>()
  /** 翻譯快取:locale -> translations (用於 ETag 304 回應) */
  private translationCache = new Map<string, TranslationMap>()

  /**
   * 建立遠端載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: RemoteLoaderConfig) {
    this.name = config.name || 'RemoteLoader'
    this.url = config.url
    this.headers = config.headers || {}
    this.timeout = config.timeout ?? 10000
    this.retries = config.retries ?? 3
    this.retryDelay = config.retryDelay ?? 1000
    this.etagCache = config.etagCache ?? true
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,載入失敗則返回 null
   */
  async load(locale: string): Promise<TranslationMap | null> {
    // 重試邏輯
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const result = await this.fetchWithTimeout(locale)
        return result
      } catch {
        // 如果不是最後一次嘗試,等待後重試
        if (attempt < this.retries) {
          const delay = this.retryDelay * 2 ** attempt
          await this.sleep(delay)
        }
      }
    }

    // 所有重試都失敗,嘗試備用載入器
    if (this.fallbackLoader) {
      return this.fallbackLoader.load(locale)
    }

    return null
  }

  /**
   * 發送 HTTP 請求並處理 ETag 快取
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源
   */
  private async fetchWithTimeout(locale: string): Promise<TranslationMap | null> {
    const url = this.url.replace(':locale', locale)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = { ...this.headers }

      // 如果啟用 ETag 快取且有快取的 ETag,加入 If-None-Match 標頭
      if (this.etagCache && this.etagMap.has(locale)) {
        headers['If-None-Match'] = this.etagMap.get(locale)!
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      // 處理 304 Not Modified
      if (response.status === 304) {
        const cached = this.translationCache.get(locale)
        if (cached) {
          return cached
        }
      }

      // 處理錯誤狀態碼
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as TranslationMap

      // 儲存 ETag 和翻譯快取
      if (this.etagCache) {
        const etag = response.headers.get('ETag')
        if (etag) {
          this.etagMap.set(locale, etag)
          this.translationCache.set(locale, data)
        }
      }

      return data
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 延遲函數
   *
   * @param ms - 延遲時間 (毫秒)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 設定備用載入器
   *
   * @param loader - 備用載入器
   * @returns 當前實例,支援鏈式調用
   */
  fallback(loader: TranslationLoader): TranslationLoaderChain {
    this.fallbackLoader = loader
    return this
  }

  /**
   * 清除 ETag 和翻譯快取
   */
  clearCache(): void {
    this.etagMap.clear()
    this.translationCache.clear()
  }
}
