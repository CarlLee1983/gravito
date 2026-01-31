/**
 * @file packages/cosmos/src/loaders/EdgeKVLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 通用 Edge KV 儲存載入器
 */

import type { TranslationMap } from '../I18nService'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * KV 儲存介面(通用抽象)
 *
 * 定義通用的 KV 儲存操作介面
 * 可以被不同的 KV 儲存後端實現
 *
 * @public
 * @since 3.2.0
 */
export interface KVStorage {
  /**
   * 從 KV 儲存讀取值
   *
   * @param key - 鍵
   * @returns 值,如果不存在則返回 null
   */
  get(key: string): Promise<string | null>

  /**
   * 寫入值到 KV 儲存(可選)
   *
   * @param key - 鍵
   * @param value - 值
   */
  put?(key: string, value: string): Promise<void>

  /**
   * 從 KV 儲存刪除值(可選)
   *
   * @param key - 鍵
   */
  delete?(key: string): Promise<void>
}

/**
 * Edge KV 載入器配置
 *
 * @public
 * @since 3.2.0
 */
export interface EdgeKVLoaderConfig extends LoaderConfig {
  /**
   * KV 儲存實例
   */
  storage: KVStorage

  /**
   * Key 前綴
   *
   * @default 'i18n'
   */
  prefix?: string

  /**
   * Key 模板
   *
   * 可用的佔位符:
   * - `:prefix` - Key 前綴
   * - `:locale` - 語言代碼
   *
   * @default ':prefix::locale'
   *
   * @example
   * ```typescript
   * // 使用冒號分隔
   * keyTemplate: ':prefix::locale' // 'i18n:zh-TW'
   *
   * // 使用斜線分隔
   * keyTemplate: ':prefix/:locale.json' // 'i18n/zh-TW.json'
   *
   * // 僅使用語言代碼
   * keyTemplate: ':locale' // 'zh-TW'
   * ```
   */
  keyTemplate?: string
}

/**
 * 通用 Edge KV 載入器
 *
 * 支援任何符合 KVStorage 介面的儲存後端
 * 適用於 Edge Runtime 環境的 KV 儲存
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * // 自訂 KV 儲存實現
 * const customStorage: KVStorage = {
 *   async get(key: string) {
 *     // 從你的 KV 儲存讀取
 *     return await myKV.get(key)
 *   }
 * }
 *
 * const loader = new EdgeKVLoader({
 *   storage: customStorage,
 *   prefix: 'translations',
 *   keyTemplate: ':prefix/:locale.json'
 * })
 *
 * const translations = await loader.load('zh-TW')
 * // 讀取 key: 'translations/zh-TW.json'
 * ```
 *
 * ## 適用場景
 *
 * - **Cloudflare Workers KV**: 使用 CloudflareKVLoader
 * - **Vercel KV**: 使用 VercelKVLoader
 * - **自訂 KV 儲存**: 實現 KVStorage 介面
 *
 * ## 優缺點
 *
 * **優點**:
 * - Edge Runtime 原生支援
 * - 低延遲讀取(邊緣快取)
 * - 支援動態更新
 *
 * **缺點**:
 * - 需要額外的儲存服務
 * - 可能有額外成本
 * - 需要預先上傳翻譯到 KV
 */
export class EdgeKVLoader implements TranslationLoaderChain {
  public readonly name: string
  private storage: KVStorage
  private prefix: string
  private keyTemplate: string
  private fallbackLoader?: TranslationLoader

  /**
   * 建立 Edge KV 載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: EdgeKVLoaderConfig) {
    this.name = config.name || 'EdgeKVLoader'
    this.storage = config.storage
    this.prefix = config.prefix || 'i18n'
    this.keyTemplate = config.keyTemplate || ':prefix::locale'
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,載入失敗則返回 null 或嘗試 fallback
   */
  async load(locale: string): Promise<TranslationMap | null> {
    try {
      const key = this.buildKey(locale)
      const value = await this.storage.get(key)

      if (!value) {
        return this.tryFallback(locale)
      }

      return JSON.parse(value) as TranslationMap
    } catch (error) {
      console.error(`[EdgeKVLoader] Failed to load ${locale}:`, error)
      return this.tryFallback(locale)
    }
  }

  /**
   * 建立 KV 儲存的 key
   *
   * @param locale - 語言代碼
   * @returns KV key
   */
  private buildKey(locale: string): string {
    return this.keyTemplate.replace(':prefix', this.prefix).replace(':locale', locale)
  }

  /**
   * 嘗試使用備用載入器
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源或 null
   */
  private async tryFallback(locale: string): Promise<TranslationMap | null> {
    if (this.fallbackLoader) {
      return this.fallbackLoader.load(locale)
    }
    return null
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
   * 儲存翻譯資源到 KV 儲存(如果儲存支援 put 操作)
   *
   * @param locale - 語言代碼
   * @param translations - 翻譯資源
   *
   * @example
   * ```typescript
   * await loader.put('zh-TW', { hello: '你好' })
   * ```
   */
  async put(locale: string, translations: TranslationMap): Promise<void> {
    if (!this.storage.put) {
      throw new Error('[EdgeKVLoader] Storage does not support put operation')
    }

    const key = this.buildKey(locale)
    const value = JSON.stringify(translations)
    await this.storage.put(key, value)
  }

  /**
   * 從 KV 儲存刪除翻譯資源(如果儲存支援 delete 操作)
   *
   * @param locale - 語言代碼
   *
   * @example
   * ```typescript
   * await loader.delete('zh-TW')
   * ```
   */
  async delete(locale: string): Promise<void> {
    if (!this.storage.delete) {
      throw new Error('[EdgeKVLoader] Storage does not support delete operation')
    }

    const key = this.buildKey(locale)
    await this.storage.delete(key)
  }
}
