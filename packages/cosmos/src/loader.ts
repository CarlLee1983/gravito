/**
 * @file packages/cosmos/src/loader.ts
 * @module @gravito/cosmos/loader
 * @description Utilities for loading translation files from the filesystem.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

/**
 * Load translations from a directory.
 *
 * Scans the specified directory for JSON files and loads them as translation bundles.
 * The filename (without extension) is used as the locale key.
 *
 * @example
 * ```
 * /lang
 *   /en.json    -> { "welcome": "Hello" }
 *   /zh-TW.json -> { "welcome": "你好" }
 * ```
 *
 * @param directory - The absolute path to the translations directory.
 * @returns A promise that resolves to a map of locale -> translations.
 * @public
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
      `[Orbit-I18n] Could not load translations from ${directory}. Directory might not exist.`
    )
  }

  return translations
}

/**
 * Load translations for a specific locale from a directory.
 *
 * Expects a file named `{locale}.json` in the given directory.
 *
 * @param directory - The directory containing translation files.
 * @param locale - The locale string to load.
 * @returns A promise that resolves to the translations map, or null if the file could not be read.
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
