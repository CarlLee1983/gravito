import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { type I18nService, OrbitCosmos } from '@gravito/cosmos'

const port = parseInt(process.env.PORT || '3007', 10)
const core = new PlanetCore()

const defaultCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ')
const cspValue = process.env.APP_CSP
const csp = cspValue === 'false' ? false : (cspValue ?? defaultCsp)
const hstsMaxAge = Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10)
const bodyLimit = Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10)
const requireLength = process.env.APP_BODY_REQUIRE_LENGTH === 'true'

core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: csp,
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: Number.isNaN(hstsMaxAge) ? 15552000 : hstsMaxAge, includeSubDomains: true }
        : false,
  })
)
if (!Number.isNaN(bodyLimit) && bodyLimit > 0) {
  core.adapter.use('*', bodySizeLimit(bodyLimit, { requireContentLength: requireLength }))
}

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
