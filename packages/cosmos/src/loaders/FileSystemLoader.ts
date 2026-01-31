/**
 * @file packages/cosmos/src/loaders/FileSystemLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 從檔案系統載入翻譯資源的實現
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TranslationMap } from '../I18nService'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * 檔案系統載入器配置
 *
 * @public
 * @since 3.1.0
 */
export interface FileSystemLoaderConfig extends LoaderConfig {
  /**
   * 翻譯檔案所在的基礎目錄
   *
   * @example '/app/lang'
   */
  baseDir: string

  /**
   * 檔案副檔名
   *
   * @default '.json'
   */
  extension?: string
}

/**
 * 檔案系統翻譯載入器
 *
 * 從本地檔案系統載入 JSON 格式的翻譯檔案
 * 預設尋找 `{baseDir}/{locale}.json` 格式的檔案
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const loader = new FileSystemLoader({
 *   baseDir: '/app/lang',
 *   name: 'fs-loader'
 * })
 *
 * const translations = await loader.load('zh-TW')
 * // 載入 /app/lang/zh-TW.json
 * ```
 */
export class FileSystemLoader implements TranslationLoaderChain {
  public readonly name: string
  private baseDir: string
  private extension: string
  private fallbackLoader?: TranslationLoader

  /**
   * 建立檔案系統載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: FileSystemLoaderConfig) {
    this.name = config.name || 'FileSystemLoader'
    this.baseDir = config.baseDir
    this.extension = config.extension || '.json'
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,載入失敗則返回 null
   */
  async load(locale: string): Promise<TranslationMap | null> {
    try {
      const filePath = join(this.baseDir, `${locale}${this.extension}`)
      const content = await readFile(filePath, 'utf-8')
      const translations = JSON.parse(content) as TranslationMap
      return translations
    } catch (_error) {
      // 如果有備用載入器,嘗試使用備用載入器
      if (this.fallbackLoader) {
        return this.fallbackLoader.load(locale)
      }
      return null
    }
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
}
