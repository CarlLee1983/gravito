/**
 * @file packages/cosmos/src/loader.ts
 * @module @gravito/cosmos/loader
 * @description 載入翻譯檔案的工具函數 (向後相容層)
 *
 * @deprecated 自 v3.1.0 起建議使用 FileSystemLoader 類別
 * 這些函數將在 v4.0.0 中移除
 *
 * @example
 * ```typescript
 * // 舊寫法 (deprecated)
 * import { loadLocale } from '@gravito/cosmos/loader'
 * const translations = await loadLocale('/lang', 'zh-TW')
 *
 * // 新寫法 (推薦)
 * import { FileSystemLoader } from '@gravito/cosmos'
 * const loader = new FileSystemLoader({ baseDir: '/lang' })
 * const translations = await loader.load('zh-TW')
 * ```
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import { CosmosError } from './errors/CosmosError'
import { CosmosErrorCodes } from './errors/codes'

/**
 * 偵測 Bun 運行時是否原生支援 JSON5 解析
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
 * 解析 JSON5 格式字串（降級到 json5 npm 套件）
 *
 * @param content - 要解析的 JSON5 字串
 * @returns 解析結果
 */
async function parseJson5(content: string): Promise<unknown> {
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
    throw new CosmosError(500, CosmosErrorCodes.UNSUPPORTED_FORMAT, {
      message:
        '[Cosmos] JSON5 parsing requires either Bun v1.2+ or the `json5` npm package. ' +
        'Please install it: bun add json5',
    })
  }
}

/**
 * 從目錄載入所有翻譯檔案
 *
 * 掃描指定目錄中的所有 JSON 與 JSON5 檔案並載入為翻譯資源
 * 若同一語言同時存在 `.json` 與 `.json5`，以 `.json5` 優先
 * 檔案名稱(不含副檔名)將作為語言代碼
 *
 * @deprecated 自 v3.1.0 起,建議使用 FileSystemLoader 或 Json5Loader
 * @param directory - 翻譯目錄的絕對路徑
 * @returns 語言代碼到翻譯資源的對應表
 * @public
 *
 * @example
 * ```
 * /lang
 *   /en.json    -> { "welcome": "Hello" }
 *   /zh-TW.json5 -> { "welcome": "你好" }  // 支援 JSON5
 * ```
 */
export async function loadTranslations(
  directory: string
): Promise<Record<string, Record<string, string>>> {
  const translations: Record<string, Record<string, string>> = {}

  try {
    const files = await readdir(directory)

    // 收集所有支援格式的翻譯檔案，以 locale 為鍵，避免重複處理
    const localeFiles = new Map<string, string>()

    for (const file of files) {
      if (!file.endsWith('.json') && !file.endsWith('.json5')) {
        continue
      }

      const locale = parse(file).name
      const existing = localeFiles.get(locale)

      // json5 優先：若同一 locale 已有 .json，json5 可覆蓋；反之不覆蓋
      if (!existing || file.endsWith('.json5')) {
        localeFiles.set(locale, file)
      }
    }

    for (const [locale, file] of localeFiles) {
      const translationsForLocale = await loadLocale(
        directory,
        locale,
        parse(file).ext as '.json' | '.json5'
      )
      if (translationsForLocale) {
        translations[locale] = translationsForLocale
      }
    }
  } catch (_e) {
    console.warn(
      `[Cosmos] Could not load translations from ${directory}. Directory might not exist.`
    )
  }

  return translations
}

/**
 * 載入指定語言的翻譯資源
 *
 * 期望在指定目錄中找到 `{locale}.json` 或 `{locale}.json5` 格式的檔案
 *
 * @deprecated 自 v3.1.0 起,建議使用 FileSystemLoader 或 Json5Loader
 * @param directory - 包含翻譯檔案的目錄
 * @param locale - 要載入的語言代碼
 * @param extension - 檔案副檔名，預設 `.json`，可傳入 `.json5`
 * @returns 翻譯資源,載入失敗則返回 null
 * @public
 */
export async function loadLocale(
  directory: string,
  locale: string,
  extension: '.json' | '.json5' = '.json'
): Promise<Record<string, string> | null> {
  const filePath = join(directory, `${locale}${extension}`)
  try {
    const content = await readFile(filePath, 'utf-8')
    if (extension === '.json5') {
      return (await parseJson5(content)) as Record<string, string>
    }
    return JSON.parse(content)
  } catch {
    return null
  }
}
