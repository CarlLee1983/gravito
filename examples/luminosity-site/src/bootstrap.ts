import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { defineConfig, GravitoAdapter, PlanetCore } from 'gravito-core'
import { setupViteProxy } from './utils/vite'

export async function bootstrap(options: { port?: number } = {}) {
  const config = defineConfig({
    config: {
      APP_NAME: 'Luminosity',
      PORT: options.port || 3000,
      VIEW_DIR: 'src/views',
    },
    orbits: [OrbitIon, OrbitPrism],
    adapter: new GravitoAdapter(),
  })

  const core = await PlanetCore.boot(config)

  if (process.env.NODE_ENV !== 'production') {
    setupViteProxy(core)
    // Inject isDev for view templates (handlebars)
    core.adapter.use('*', async (c: any, next: any) => {
      c.set('isDev', true)
      await next()
    })
  }

  // Register Routes
  // Middleware to set locale
  const setLocale = (locale: string) => async (c: any, next: any) => {
    console.log(`[Middleware] Setting locale to: ${locale} for path: ${c.req.path}`)
    c.set('locale', locale)
    const inertia = c.get('inertia')
    if (inertia) {
      inertia.share({ locale })
    }
    await next()
  }

  const { DocsController } = await import('./controllers/DocsController.js' as any)
  const docsController = new DocsController()

  // Define routes for a specific group
  const defineRoutes = (group: any) => {
    const homeHandler = (c: any) => {
      const inertia = c.get('inertia')
      const locale = c.get('locale') || 'en'
      console.log(`[Handler] Rendering Home with locale: ${locale}`)
      return inertia.render('Home', {
        message: 'Welcome to Luminosity',
        locale: locale,
      })
    }

    group.get('/', homeHandler)
    group.get('', homeHandler)

    group.get('/features', (c: any) => {
      const inertia = c.get('inertia')
      const locale = c.get('locale') || 'en'
      return inertia.render('Features', {
        locale,
      })
    })

    group.get('/docs', (c: any) => {
      const locale = c.get('locale')
      return c.redirect(locale === 'zh' ? '/zh/docs/introduction' : '/docs/introduction')
    })

    group.get('/docs/*', docsController.show)
  }

  // Default Routes (English)
  core.router.middleware(setLocale('en')).group((root) => {
    defineRoutes(root)
  })

  // English Explicit (/en)
  core.router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en) => {
      defineRoutes(en)
    })

  // Chinese Routes (/zh)
  core.router
    .prefix('/zh')
    .middleware(setLocale('zh'))
    .group((zh) => {
      defineRoutes(zh)
    })

  // SEO Routes (Serve from dist-static if available)
  core.router.get('/sitemap.xml', async (c: any) => {
    try {
      // Lazy load fs/path to allow bootstrapping in various envs
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const content = await readFile(join(process.cwd(), 'dist-static', 'sitemap.xml'), 'utf-8')
      c.header('Content-Type', 'application/xml')
      return c.body(content)
    } catch (e) {
      return c.text('Sitemap not found. Please run "bun run build:static" first.', 404)
    }
  })

  core.router.get('/robots.txt', async (c: any) => {
    try {
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const content = await readFile(join(process.cwd(), 'dist-static', 'robots.txt'), 'utf-8')
      c.header('Content-Type', 'text/plain')
      return c.body(content)
    } catch (e) {
      return c.text('Robots.txt not found. Please run "bun run build:static" first.', 404)
    }
  })

  return core
}
