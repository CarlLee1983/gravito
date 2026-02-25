/**
 * @file packages/cosmos/src/loaders/Json5Loader.ts
 * @module @gravito/cosmos/loaders
 * @description 支援 JSON5 格式翻譯檔案的混合載入器
 *
 * ⚠️ **Node.js Only**
 *
 * 此載入器依賴 Node.js 的 fs 模組，無法在 Edge Runtime 使用
 *
 * 支援混合載入 `.json5` 與 `.json` 格式的翻譯檔案，
 * 可配置載入優先級以彈性應對不同場景
 *
 * @since 3.2.0
 * @platform node
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TranslationMap } from '../I18nService'
import { detectRuntime } from '../runtime/detector'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * Json5Loader 優先級策略
 *
 * - `json5-first`: 優先嘗試 `.json5`，失敗後退到 `.json`
 * - `json-first`: 優先嘗試 `.json`，失敗後退到 `.json5`
 * - `json5-only`: 只載入 `.json5`，不降級
 * - `json-only`: 只載入 `.json`，不降級
 *
 * @public
 * @since 3.2.0
 */
export type Json5LoaderPriority = 'json5-first' | 'json-first' | 'json5-only' | 'json-only'

/**
 * Json5Loader 配置
 *
 * @public
 * @since 3.2.0
 */
export interface Json5LoaderConfig extends LoaderConfig {
  /**
   * 翻譯檔案所在的基礎目錄
   *
   * @example '/app/lang'
   */
  baseDir: string

  /**
   * 載入優先級策略
   *
   * @default 'json5-first'
   */
  priority?: Json5LoaderPriority
}

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
 * 解析 JSON5 格式字串
 *
 * 優先使用 Bun 原生 JSON5 解析器（Bun v1.2+），
 * 降級至 `json5` npm 套件
 *
 * @param content - 要解析的 JSON5 字串
 * @returns 解析結果
 * @throws {Error} 若兩種方式均不可用
 */
async function parseJson5Content(content: string): Promise<unknown> {
  if (hasBunJson5()) {
    const bunJson5 = (globalThis.Bun as Record<string, unknown>).JSON5 as {
      parse: (text: string) => unknown
    }
    return bunJson5.parse(content)
  }

  // 使用變數作為路徑以避免靜態型別解析（json5 為可選 peer dependency）
  try {
    const pkgName = 'json5'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json5Module = await (import(pkgName) as Promise<any>)
    const json5 = json5Module.default ?? json5Module
    return (json5 as { parse: (text: string) => unknown }).parse(content)
  } catch {
    throw new Error(
      '[Json5Loader] JSON5 parsing requires either Bun v1.2+ (native support) ' +
        'or the `json5` npm package. Please install it: bun add json5'
    )
  }
}

/**
 * JSON5 混合翻譯載入器
 *
 * 支援混合載入 `.json5` 與 `.json` 格式的翻譯檔案。
 * 透過優先級配置彈性控制載入策略，並支援 fallback 降級鏈。
 *
 * @public
 * @since 3.2.0
 *
 * @example json5-first 優先（預設）
 * ```typescript
 * const loader = new Json5Loader({
 *   baseDir: '/app/lang',
 *   priority: 'json5-first'
 * })
 * // 嘗試 zh-TW.json5，若不存在則退回 zh-TW.json
 * const translations = await loader.load('zh-TW')
 * ```
 *
 * @example 搭配 fallback 鏈
 * ```typescript
 * const loader = new Json5Loader({ baseDir: '/app/lang' })
 *   .fallback(new MemoryLoader({ en: { welcome: 'Hello' } }))
 *
 * const translations = await loader.load('en')
 * ```
 */
export class Json5Loader implements TranslationLoaderChain {
  public readonly name: string
  private readonly baseDir: string
  private readonly priority: Json5LoaderPriority
  private fallbackLoader?: TranslationLoader

  /**
   * 建立 Json5Loader 實例
   *
   * @param config - 載入器配置
   * @throws {Error} 如果在 Edge Runtime 環境中使用
   */
  constructor(config: Json5LoaderConfig) {
    // 運行時檢查
    const runtime = detectRuntime()
    if (runtime === 'edge') {
      throw new Error(
        '[Json5Loader] This loader requires Node.js and cannot run in Edge Runtime. ' +
          'Use MemoryLoader, RemoteLoader, or EdgeKVLoader instead.'
      )
    }

    this.name = config.name ?? 'Json5Loader'
    this.baseDir = config.baseDir
    this.priority = config.priority ?? 'json5-first'
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * 根據優先級策略嘗試不同副檔名的檔案
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源，所有嘗試均失敗則返回 null
   */
  async load(locale: string): Promise<TranslationMap | null> {
    const result = await this.loadByPriority(locale)

    if (result !== null) {
      return result
    }

    // 嘗試外部 fallback 載入器
    if (this.fallbackLoader) {
      return this.fallbackLoader.load(locale)
    }

    return null
  }

  /**
   * 設定備用載入器
   *
   * @param loader - 備用載入器
   * @returns 當前實例，支援鏈式調用
   */
  fallback(loader: TranslationLoader): TranslationLoaderChain {
    this.fallbackLoader = loader
    return this
  }

  /**
   * 取得當前優先級策略
   *
   * @returns 優先級策略字串
   */
  getPriority(): Json5LoaderPriority {
    return this.priority
  }

  /**
   * 根據優先級策略依序嘗試載入翻譯檔案
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源，或 null
   */
  private async loadByPriority(locale: string): Promise<TranslationMap | null> {
    switch (this.priority) {
      case 'json5-first':
        return (await this.tryLoadJson5(locale)) ?? (await this.tryLoadJson(locale))
      case 'json-first':
        return (await this.tryLoadJson(locale)) ?? (await this.tryLoadJson5(locale))
      case 'json5-only':
        return this.tryLoadJson5(locale)
      case 'json-only':
        return this.tryLoadJson(locale)
    }
  }

  /**
   * 嘗試載入 `.json5` 格式的翻譯檔案
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源，或 null
   */
  private async tryLoadJson5(locale: string): Promise<TranslationMap | null> {
    try {
      const filePath = join(this.baseDir, `${locale}.json5`)
      const content = await readFile(filePath, 'utf-8')
      return (await parseJson5Content(content)) as TranslationMap
    } catch {
      return null
    }
  }

  /**
   * 嘗試載入 `.json` 格式的翻譯檔案
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源，或 null
   */
  private async tryLoadJson(locale: string): Promise<TranslationMap | null> {
    try {
      const filePath = join(this.baseDir, `${locale}.json`)
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as TranslationMap
    } catch {
      return null
    }
  }
}
