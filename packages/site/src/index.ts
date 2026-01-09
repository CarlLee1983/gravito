import { bodySizeLimit, type GravitoConfig, PlanetCore, securityHeaders } from '@gravito/core'
import { I18nOrbit } from '@gravito/cosmos'
import { OrbitMonolith } from '@gravito/monolith'

// Load Translations (Mock for now)
const translations = {
  en: { hero: { title: 'Gravito Framework' }, nav: { switch: '中文' } },
  zh: { hero: { title: 'Gravito 框架' }, nav: { switch: 'English' } },
}

// Dynamic Content Path Logic (Dev vs Docker vs Root)
const isSiteRoot = process.cwd().endsWith('site')
const contentPath = isSiteRoot ? 'resources/content/docs' : 'packages/site/resources/content/docs'

const config: GravitoConfig = {
  orbits: [
    new I18nOrbit({
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh'],
      translations,
    }),
    new OrbitMonolith({
      root: process.cwd(),
      collections: {
        docs: { path: contentPath },
      },
    }),
  ],
}

export const app = await PlanetCore.boot(config)

const defaultCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ')
const cspValue = process.env.APP_CSP
const csp = cspValue === 'false' ? false : (cspValue ?? defaultCsp)
const hstsMaxAge = Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10)
const bodyLimit = Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10)
const requireLength = process.env.APP_BODY_REQUIRE_LENGTH === 'true'

app.adapter.use(
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
  app.adapter.use('*', bodySizeLimit(bodyLimit, { requireContentLength: requireLength }))
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// SEO & I18n Routing
app.router.prefix('/:locale').group((router) => {
  // Landing Page
  router.get('/', async (c) => {
    const i18n = c.get('i18n') as any
    const lang = i18n.locale
    const heroTitle = escapeHtml(String(i18n.t('hero.title')))
    const switchLabel = escapeHtml(String(i18n.t('nav.switch')))

    return c.html(`
            <!DOCTYPE html>
            <html lang="${lang}">
            <head>
                <title>Gravito - Agentic AI Framework</title>
                <meta name="description" content="The future of web development.">
            </head>
            <body>
                <h1>${heroTitle}</h1>
                <nav>
                    <a href="/${lang}/docs/intro">Documentation</a> | 
                    <a href="/${lang === 'en' ? 'zh' : 'en'}">${switchLabel}</a>
                </nav>
            </body>
            </html>
        `)
  })

  // Docs Page with Full SEO
  router.get('/docs/:slug', async (c) => {
    const content = c.get('content') as any
    const i18n = c.get('i18n') as any
    const slug = c.req.param('slug')
    const locale = i18n.locale

    const doc = await content.find('docs', slug, locale)

    if (!doc) {
      return c.text('Not Found', 404)
    }

    const gaId = process.env.GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'
    const baseUrl = 'https://gravito.dev'
    const safeSlug = encodeURIComponent(String(slug))
    const url = `${baseUrl}/${locale}/docs/${safeSlug}`
    const imageUrl = `${baseUrl}/og-image.jpg` // Placeholder
    const title = escapeHtml(String(doc.meta.title ?? 'Gravito'))
    const description = escapeHtml(String(doc.meta.description ?? ''))

    return c.html(`
            <!DOCTYPE html>
            <html lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- Primary Meta Tags -->
                <title>${title} | Gravito</title>
                <meta name="title" content="${title} | Gravito">
                <meta name="description" content="${description}">
                <link rel="canonical" href="${url}">

                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="article">
                <meta property="og:url" content="${url}">
                <meta property="og:title" content="${title} | Gravito">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:site_name" content="Gravito">
                <meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_TW'}">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${url}">
                <meta property="twitter:title" content="${title} | Gravito">
                <meta property="twitter:description" content="${description}">
                <meta property="twitter:image" content="${imageUrl}">

                <!-- Google Analytics -->
                <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
                <script>
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                </script>
            </head>
            <body>
                <nav>
                    <a href="/${locale === 'en' ? 'zh' : 'en'}/docs/${slug}">
                        ${locale === 'en' ? '中文' : 'English'}
                    </a>
                </nav>
                <article>
                    ${doc.body}
                </article>
            </body>
            </html>
        `)
  })
})
// Installer Scripts (Redirect to GitHub Raw or serve directly)
const INSTALL_SCRIPT_URL =
  'https://raw.githubusercontent.com/gravito-framework/quasar-go/main/scripts/install.sh'

app.router.get('/quasar-go', (c) => c.redirect(INSTALL_SCRIPT_URL))
app.router.get('/quasar', (c) => c.redirect(INSTALL_SCRIPT_URL)) // Backward compatibility

// Root redirect
app.router.get('/', (c) => c.redirect('/en'))

// Liveness Probe
app.router.get('/health', (c) => c.text('OK'))

// Conditional Start (Only if run directly via bun run)
if (import.meta.main) {
  app.liftoff(3000)
}

// Default export for testing or library usage
export default {
  port: 3000,
  fetch: app.adapter.fetch.bind(app.adapter),
}
