/**
 * @file packages/cosmos/src/loaders/FileSystemLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 從檔案系統載入翻譯資源的實現
 *
 * ⚠️ **Node.js Only**
 *
 * 此載入器依賴 Node.js 的 fs 模組，無法在 Edge Runtime 使用
 *
 * Edge Runtime 替代方案:
 * - MemoryLoader: 靜態翻譯
 * - RemoteLoader: HTTP API
 * - EdgeKVLoader: KV 儲存
 *
 * @since 3.1.0
 * @platform node
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TranslationMap } from '../I18nService'
import { detectRuntime } from '../runtime/detector'
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
   * @throws {Error} 如果在 Edge Runtime 環境中使用
   */
  constructor(config: FileSystemLoaderConfig) {
    // 運行時檢查
    const runtime = detectRuntime()
    if (runtime === 'edge') {
      throw new Error(
        '[FileSystemLoader] This loader requires Node.js and cannot run in Edge Runtime. ' +
          'Use MemoryLoader, RemoteLoader, or EdgeKVLoader instead.'
      )
    }

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
