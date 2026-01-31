/**
 * @file packages/cosmos/src/loaders/TranslationLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 抽象的翻譯載入器介面,支援多種翻譯來源
 */

import type { TranslationMap } from '../I18nService'

/**
 * 翻譯載入器介面
 *
 * 定義統一的載入介面,支援多種實現:
 * - FileSystemLoader: 從檔案系統載入
 * - RemoteLoader: 從 HTTP API 載入
 * - DatabaseLoader: 從資料庫載入
 * - EdgeLoader: Edge Runtime 相容的載入器
 *
 * @public
 * @since 3.1.0
 */
export interface TranslationLoader {
  /**
   * 載入器名稱,用於識別和除錯
   */
  readonly name: string

  /**
   * 載入指定語言的翻譯資源
   *
   * @param locale - 要載入的語言代碼 (如 'en', 'zh-TW')
   * @returns 翻譯資源,如果載入失敗則返回 null
   *
   * @example
   * ```typescript
   * const translations = await loader.load('zh-TW')
   * if (translations) {
   *   console.log(translations.welcome) // "歡迎"
   * }
   * ```
   */
  load(locale: string): Promise<TranslationMap | null>
}

/**
 * 支援鏈式組合的翻譯載入器介面
 *
 * 允許多個載入器組合,實現降級策略:
 * 主要載入器失敗時,自動嘗試備用載入器
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const loader = new FileSystemLoader(config)
 *   .fallback(new RemoteLoader(remoteConfig))
 *   .fallback(new MemoryLoader(fallbackTranslations))
 *
 * // 載入順序: FileSystem -> Remote -> Memory
 * const translations = await loader.load('zh-TW')
 * ```
 */
export interface TranslationLoaderChain extends TranslationLoader {
  /**
   * 設定備用載入器
   *
   * 當當前載入器失敗時,會嘗試使用備用載入器
   *
   * @param loader - 備用載入器
   * @returns 鏈式載入器實例,支援繼續串接
   */
  fallback(loader: TranslationLoader): TranslationLoaderChain
}

/**
 * 載入器配置的基礎介面
 *
 * 所有載入器都應該接受的通用配置選項
 *
 * @public
 * @since 3.1.0
 */
export interface LoaderConfig {
  /**
   * 載入器名稱 (可選)
   */
  name?: string

  /**
   * 快取策略 (可選)
   */
  cache?: {
    /** 是否啟用快取 */
    enabled: boolean
    /** 快取過期時間 (毫秒) */
    ttl?: number
  }
}
