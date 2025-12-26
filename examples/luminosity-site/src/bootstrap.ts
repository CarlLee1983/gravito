import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { defineConfig, GravitoAdapter, type GravitoContext, PlanetCore } from 'gravito-core'
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
    core.adapter.use('*', (async (c: GravitoContext, next: () => Promise<void>) => {
      c.set('isDev', true)
      return await next()
    }) as any)
  }

  // Register Routes
  // Middleware to set locale
  const setLocale = (locale: string) => async (c: GravitoContext, next: () => Promise<void>) => {
    console.log(`[Middleware] Setting locale to: ${locale} for path: ${c.req.path}`)
    c.set('locale', locale)
    const inertia = c.get('inertia')
    if (inertia) {
      ;(inertia as any).share({ locale })
    }
    return await next()
  }

  // biome-ignore lint/suspicious/noExplicitAny: Dynamic import type
  const { DocsController } = await import('./controllers/DocsController.js' as any)
  const docsController = new DocsController()

  // Define routes for a specific group
  // biome-ignore lint/suspicious/noExplicitAny: Photon Group Type
  const defineRoutes = (group: any) => {
    const homeHandler = (c: GravitoContext) => {
      const inertia = c.get('inertia')
      const locale = c.get('locale') || 'en'
      console.log(`[Handler] Rendering Home with locale: ${locale}`)
      return (inertia as any)?.render('Home', {
        message: 'Welcome to Luminosity',
        locale: locale,
      })
    }

    group.get('/', homeHandler)
    group.get('', homeHandler)

    group.get('/features', (c: GravitoContext) => {
      const inertia = c.get('inertia')
      const locale = c.get('locale') || 'en'
      return (inertia as any)?.render('Features', {
        locale,
      })
    })

    group.get('/docs', (c: GravitoContext) => {
      const locale = c.get('locale')
      return c.redirect(locale === 'zh' ? '/zh/docs/introduction' : '/docs/introduction')
    })

    group.get('/docs/*', docsController.show)
  }

  // Default Routes (English)
  core.router.middleware(setLocale('en') as any).group((root) => {
    defineRoutes(root)
  })

  // English Explicit (/en)
  core.router
    .prefix('/en')
    .middleware(setLocale('en') as any)
    .group((en) => {
      defineRoutes(en)
    })

  // Chinese Routes (/zh)
  core.router
    .prefix('/zh')
    .middleware(setLocale('zh') as any)
    .group((zh) => {
      defineRoutes(zh)
    })

  // SEO Routes (Serve from dist-static if available)
  core.router.get('/sitemap.xml', async (c: GravitoContext) => {
    try {
      // Lazy load fs/path to allow bootstrapping in various envs
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const content = await readFile(join(process.cwd(), 'dist-static', 'sitemap.xml'), 'utf-8')
      c.header('Content-Type', 'application/xml')
      return c.body(content)
    } catch (_e) {
      return c.text('Sitemap not found. Please run "bun run build:static" first.', 404)
    }
  })

  core.router.get('/robots.txt', async (c: GravitoContext) => {
    try {
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const content = await readFile(join(process.cwd(), 'dist-static', 'robots.txt'), 'utf-8')
      c.header('Content-Type', 'text/plain')
      return c.body(content)
    } catch (_e) {
      return c.text('Robots.txt not found. Please run "bun run build:static" first.', 404)
    }
  })

  // 404 Handler - Used by SSG to generate 404.html
  const notFoundHandler = (c: GravitoContext) => {
    const inertia = c.get('inertia')
    // Detect locale from path or default to 'en'
    const path = c.req.path
    const locale = path.startsWith('/zh') ? 'zh' : 'en'
    c.set('locale', locale)
    if (inertia) {
      ;(inertia as any).share({ locale })
    }
    return (inertia as any)?.render('NotFound', { locale })
  }

  // SSG 404 generation route
  core.router.get('/__404_gen__', notFoundHandler)

  // Catch-all for unknown routes at runtime
  core.router.get('*', notFoundHandler)

  return core
}
