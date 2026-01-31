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

/**
 * 從目錄載入所有翻譯檔案
 *
 * 掃描指定目錄中的所有 JSON 檔案並載入為翻譯資源
 * 檔案名稱(不含副檔名)將作為語言代碼
 *
 * @deprecated 自 v3.1.0 起,建議使用 FileSystemLoader
 * @param directory - 翻譯目錄的絕對路徑
 * @returns 語言代碼到翻譯資源的對應表
 * @public
 *
 * @example
 * ```
 * /lang
 *   /en.json    -> { "welcome": "Hello" }
 *   /zh-TW.json -> { "welcome": "你好" }
 * ```
 */
export async function loadTranslations(
  directory: string
): Promise<Record<string, Record<string, string>>> {
  const translations: Record<string, Record<string, string>> = {}

  try {
    const files = await readdir(directory)

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue
      }

      const locale = parse(file).name // 'en' from 'en.json'
      const translationsForLocale = await loadLocale(directory, locale)
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
 * 期望在指定目錄中找到 `{locale}.json` 格式的檔案
 *
 * @deprecated 自 v3.1.0 起,建議使用 FileSystemLoader
 * @param directory - 包含翻譯檔案的目錄
 * @param locale - 要載入的語言代碼
 * @returns 翻譯資源,載入失敗則返回 null
 * @public
 */
export async function loadLocale(
  directory: string,
  locale: string
): Promise<Record<string, string> | null> {
  const filePath = join(directory, `${locale}.json`)
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
