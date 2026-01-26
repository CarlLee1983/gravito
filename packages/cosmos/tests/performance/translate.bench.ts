import { bench, run } from 'mitata'
import { I18nManager } from '../../src/I18nService'
import { generateLargeTranslations } from '../helpers/factory'

const manager = new I18nManager({
  defaultLocale: 'en',
  supportedLocales: ['en', 'zh-TW'],
  translations: generateLargeTranslations(),
})

// Warmup
manager.translate('locale0', 'key0')

bench('Simple translation (cache hit)', () => {
  manager.translate('locale0', 'key0')
})

bench('Batch translation (100 keys)', () => {
  const keys = Array.from({ length: 100 }, (_, i) => `key${i}`)
  manager.tMany(keys)
})

bench('Fallback chain (missing key)', () => {
  manager.translate('locale0', 'missing.key')
})

await run()
