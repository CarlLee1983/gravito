/**
 * @file packages/cosmos/src/loaders/FileSystemLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 從檔案系統載入翻譯資源的實現，支援 JSON 與 JSON5 格式
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
import { CosmosError } from '../errors/CosmosError'
import { CosmosErrorCodes } from '../errors/codes'
import { detectRuntime } from '../runtime/detector'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * 偵測 Bun 運行時是否原生支援 JSON5 解析
 *
 * Bun v1.2+ 提供 `Bun.JSON5` 全域物件
 *
 * @returns 是否具備 Bun 原生 JSON5 能力
 */
function hasBunJson5(): boolean {
  return (
    typeof globalThis.Bun !== 'undefined' &&
    typeof (globalThis.Bun as Record<string, unknown>).JSON5 === 'object'
  )
}

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
   * 支援 `.json` 與 `.json5` 兩種格式
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
      throw new CosmosError(500, CosmosErrorCodes.EDGE_RUNTIME_UNSUPPORTED, {
        message:
          '[FileSystemLoader] This loader requires Node.js and cannot run in Edge Runtime. ' +
          'Use MemoryLoader, RemoteLoader, or EdgeKVLoader instead.',
      })
    }

    this.name = config.name || 'FileSystemLoader'
    this.baseDir = config.baseDir
    this.extension = config.extension || '.json'
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * 根據 extension 自動判斷使用 JSON 或 JSON5 解析器
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,載入失敗則返回 null
   */
  async load(locale: string): Promise<TranslationMap | null> {
    try {
      const filePath = join(this.baseDir, `${locale}${this.extension}`)
      const content = await readFile(filePath, 'utf-8')
      const translations =
        this.extension === '.json5'
          ? await this.parseJson5(content)
          : (JSON.parse(content) as TranslationMap)
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
   * 解析 JSON5 內容
   *
   * 優先使用 Bun 原生 JSON5 解析器（Bun v1.2+），
   * 若不可用則嘗試動態載入 `json5` npm 套件作為降級方案
   *
   * @param content - 要解析的 JSON5 字串
   * @returns 解析後的翻譯資源
   * @throws {Error} 若 Bun 原生與 json5 套件均不可用時
   */
  private async parseJson5(content: string): Promise<TranslationMap> {
    // 優先使用 Bun 原生 JSON5 解析器
    if (hasBunJson5()) {
      const bunJson5 = (globalThis.Bun as Record<string, unknown>).JSON5 as {
        parse: (text: string) => unknown
      }
      return bunJson5.parse(content) as TranslationMap
    }

    // 降級方案：動態載入 json5 npm 套件
    // 使用變數作為路徑以避免靜態型別解析（json5 為可選 peer dependency）
    try {
      const pkgName = 'json5'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json5Module = await (import(pkgName) as Promise<any>)
      const json5 = json5Module.default ?? json5Module
      return (json5 as { parse: (text: string) => unknown }).parse(content) as TranslationMap
    } catch {
      throw new CosmosError(500, CosmosErrorCodes.UNSUPPORTED_FORMAT, {
        message:
          '[FileSystemLoader] JSON5 parsing requires either Bun v1.2+ (native support) ' +
          'or the `json5` npm package. Please install it: bun add json5',
      })
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
