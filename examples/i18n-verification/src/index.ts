import { type I18nService, OrbitCosmos } from '@gravito/cosmos'
import { PlanetCore } from 'gravito-core'

const port = parseInt(process.env.PORT || '3007', 10)
const core = new PlanetCore()

await core.orbit(
  new OrbitCosmos({
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh', 'zh-TW'],
    translations: {
      en: {
        hello: 'Hello World',
        welcome: 'Welcome :name',
      },
      zh: {
        hello: '你好世界',
        welcome: '歡迎 :name',
      },
      'zh-TW': {
        hello: '你好世界',
        welcome: '歡迎 :name',
      },
    },
  })
)

core.router.get('/', (c) => {
  // Access i18n from context (injected by middleware)
  const i18n = c.get('i18n' as any) as unknown as I18nService

  // Basic translation
  const hello = i18n.t('hello')

  // Parameter substitution
  const name = c.req.query('name') || 'User'
  const welcome = i18n.t('welcome', { name })

  return c.json({
    locale: i18n.getLocale(),
    hello,
    welcome,
  })
})

const liftoff = core.liftoff(port)
Bun.serve(liftoff)

console.log(`[I18nServer] Ready on port ${port}`)
