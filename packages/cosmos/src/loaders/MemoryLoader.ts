/**
 * @file packages/cosmos/src/loaders/MemoryLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 從記憶體載入翻譯資源的實現
 */

import type { TranslationMap } from '../I18nService'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * 記憶體載入器配置
 *
 * @public
 * @since 3.2.0
 */
export interface MemoryLoaderConfig extends LoaderConfig {
  /**
   * 預先載入的翻譯資源
   *
   * Key 為語言代碼,Value 為翻譯 Map
   */
  translations: Record<string, TranslationMap>
}

/**
 * 記憶體翻譯載入器
 *
 * 從記憶體載入預先打包的翻譯資源
 * 適用於 Edge Runtime 環境或靜態翻譯場景
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * import { MemoryLoader } from '@gravito/cosmos'
 * import en from './lang/en.json'
 * import zhTW from './lang/zh-TW.json'
 *
 * const loader = new MemoryLoader({
 *   translations: {
 *     en,
 *     'zh-TW': zhTW
 *   }
 * })
 *
 * const translations = await loader.load('zh-TW')
 * ```
 *
 * ## 適用場景
 *
 * - **靜態翻譯**: Build-time 打包的翻譯資源
 * - **Edge Runtime**: 無檔案系統的邊緣環境
 * - **測試環境**: 快速的測試資料載入
 * - **小型應用**: 翻譯量較少的應用(<100KB)
 *
 * ## 優缺點
 *
 * **優點**:
 * - 極快的載入速度(記憶體讀取)
 * - 無需網路請求
 * - Edge Runtime 相容
 *
 * **缺點**:
 * - 增加 Bundle Size
 * - 無法動態更新翻譯
 * - 不適合大量翻譯
 */
export class MemoryLoader implements TranslationLoaderChain {
  public readonly name: string
  private translations: Record<string, TranslationMap>
  private fallbackLoader?: TranslationLoader

  /**
   * 建立記憶體載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: MemoryLoaderConfig) {
    this.name = config.name || 'MemoryLoader'
    this.translations = config.translations
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,如果不存在則嘗試使用 fallback loader
   */
  async load(locale: string): Promise<TranslationMap | null> {
    const translations = this.translations[locale]

    if (translations) {
      return translations
    }

    // 嘗試使用備用載入器
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
   * 新增或更新語言的翻譯資源
   *
   * @param locale - 語言代碼
   * @param translations - 翻譯資源
   *
   * @example
   * ```typescript
   * loader.addTranslations('fr', { hello: 'Bonjour' })
   * ```
   */
  addTranslations(locale: string, translations: TranslationMap): void {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...translations,
    }
  }

  /**
   * 移除語言的翻譯資源
   *
   * @param locale - 語言代碼
   */
  removeTranslations(locale: string): void {
    delete this.translations[locale]
  }

  /**
   * 取得所有已載入的語言列表
   *
   * @returns 語言代碼陣列
   */
  getLoadedLocales(): string[] {
    return Object.keys(this.translations)
  }

  /**
   * 檢查是否已載入指定語言
   *
   * @param locale - 語言代碼
   * @returns 是否已載入
   */
  hasLocale(locale: string): boolean {
    return locale in this.translations
  }
}
