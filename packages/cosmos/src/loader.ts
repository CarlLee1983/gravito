import { readdir, readFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

/**
 * Load translations from a directory
 * Structure:
 * /lang
 *   /en.json -> { "welcome": "Hello" }
 *   /zh.json -> { "welcome": "Hello" }
 *   /en/auth.json -> { "failed": "Login failed" } (Optional deep structure, maybe later)
 *
 * For now, we support flat JSON files per locale: en.json, zh.json
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
