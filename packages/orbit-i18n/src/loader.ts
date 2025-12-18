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
      if (!file.endsWith('.json')) continue

      const locale = parse(file).name // 'en' from 'en.json'
      const content = await readFile(join(directory, file), 'utf-8')

      try {
        translations[locale] = JSON.parse(content)
      } catch (e) {
        console.error(`[Orbit-I18n] Failed to parse translation file: ${file}`, e)
      }
    }
  } catch (e) {
    console.warn(
      `[Orbit-I18n] Could not load translations from ${directory}. Directory might not exist.`
    )
  }

  return translations
}
