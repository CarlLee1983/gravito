import { asLocale, defineConfig } from '@gravito/freeze'

export const freezeConfig = defineConfig({
  staticDomains: ['gravito.dev'],
  locales: [asLocale('en'), asLocale('zh'), asLocale('zh-TW')],
  defaultLocale: asLocale('en'),
  baseUrl: 'https://gravito.dev',
  redirects: [],
})
