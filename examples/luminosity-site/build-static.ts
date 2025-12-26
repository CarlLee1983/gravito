import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { Photon } from '@gravito/photon'
import { bootstrap } from './src/bootstrap'

console.log('🏗️  Starting SSG Build for Luminosity site...')
process.env.NODE_ENV = 'production'

const execAsync = promisify(exec)

async function build() {
  // 1. Build Client Assets
  console.log('⚡ Building client assets (Vite)...')
  try {
    await execAsync('bun run build:client')
    console.log('✅ Client build complete.')
  } catch (e) {
    console.error('❌ Client build failed:', e)
    process.exit(1)
  }

  // 2. Initialize Core
  const core = await bootstrap({ port: 3000 })
  const outputDir = join(process.cwd(), 'dist-static')
  await mkdir(outputDir, { recursive: true })

  // Load Services
  const { DocsService } = await import('./src/services/DocsService')

  // Define Base Meta
  const baseUrl = 'https://lux.gravito.dev'
  const baseMeta = {
    title: 'Luminosity',
    description: 'The SmartMap Engine for modern web apps.',
    image: 'https://lux.gravito.dev/og-image.png',
  }

  // Collect Routes
  interface RouteTask {
    path: string
    meta: { title: string; description: string; url: string }
  }
  const routes: RouteTask[] = []

  // Locales
  const locales = ['en', 'zh']

  const pageMeta: Record<string, any> = {
    '/': {
      en: {
        title: 'Luminosity - Atomic Sitemap Engine',
        description:
          'High-performance, intelligent sitemap generation for modern web applications.',
      },
      zh: {
        title: 'Luminosity - 向量原子級 Sitemap 引擎',
        description: '針對現代 Web 應用程式的高效能、智慧型 Sitemap 生成方案。',
      },
    },
    '/features': {
      en: {
        title: 'Features - Luminosity',
        description:
          'Explore the powerful features of Luminosity: LSM Tree storage, Incremental Updates, and more.',
      },
      zh: {
        title: '功能特性 - Luminosity',
        description: '探索 Luminosity 的強大功能：LSM 樹儲存、增量更新等。',
      },
    },
  }

  // Add Static Routes for each locale
  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`
    const enPrefix = locale === 'en' ? '/en' : '' // Support explicit /en as well

    for (const [abstractPath, translations] of Object.entries(pageMeta)) {
      const trans = translations[locale]

      // Standard path (either / or /zh/...)
      routes.push({
        path: abstractPath === '/' ? prefix || '/' : `${prefix}${abstractPath}`,
        meta: {
          title: trans.title,
          description: trans.description,
          url: `${baseUrl}${prefix}${abstractPath === '/' ? '' : abstractPath}`,
        },
      })

      // Add explicit /en paths if locale is en
      if (locale === 'en' && abstractPath === '/') {
        routes.push({
          path: '/en',
          meta: {
            title: trans.title,
            description: trans.description,
            url: `${baseUrl}/en`,
          },
        })
      } else if (locale === 'en') {
        routes.push({
          path: `/en${abstractPath}`,
          meta: {
            title: trans.title,
            description: trans.description,
            url: `${baseUrl}/en${abstractPath}`,
          },
        })
      }
    }
  }

  // Add Docs Routes
  for (const locale of locales) {
    const sections = await DocsService.getSidebar(locale)
    for (const section of sections) {
      for (const item of section.items) {
        routes.push({
          path: item.href || '',
          meta: {
            title: `${item.title} - ${locale === 'zh' ? 'Luminosity 指南' : 'Luminosity Docs'}`,
            description: `Documentation for ${item.title} in Luminosity SEO Engine.`,
            url: baseUrl + item.href,
          },
        })

        // Also generate explicit /en route for English docs
        if (locale === 'en' && item.href?.startsWith('/docs')) {
          routes.push({
            path: `/en${item.href}`,
            meta: {
              title: `${item.title} - Luminosity Docs`,
              description: `Documentation for ${item.title} in Luminosity SEO Engine.`,
              url: baseUrl + `/en${item.href}`,
            },
          })
        }
      }
    }
  }

  // 4. Generate SEO Assets (Luminosity)
  console.log('🌟 Generating Sitemap & Robots via Luminosity...')
  const { SeoEngine, SeoRenderer, RobotsBuilder, SeoMetadata } = await import('@gravito/luminosity')

  // Helper to Inject Meta using Luminosity Engine
  const injectMeta = (html: string, meta: RouteTask['meta']) => {
    // Construct Luminosity SEO Config
    const seo = new SeoMetadata({
      meta: {
        title: meta.title,
        description: meta.description,
        canonical: meta.url,
      },
      og: {
        title: meta.title,
        description: meta.description,
        url: meta.url,
        image: baseMeta.image,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.title,
        description: meta.description,
        image: baseMeta.image,
      },
    })

    const tags = seo.toString()

    // Replace existing <title> and inject new tags
    return html.replace(/<title>.*?<\/title>/, '').replace('</head>', `${tags}\n</head>`)
  }

  // 3. Render Loop
  console.log(`🚀 Rendering ${routes.length} pages...`)

  for (const task of routes) {
    console.log(`Render: ${task.path}`)
    try {
      const res = await (core.app as Photon).request(task.path)
      if (res.status !== 200) {
        console.error(`❌ Failed ${res.status}: ${task.path}`)
        continue
      }

      let html = await res.text()
      html = injectMeta(html, task.meta)

      const filePath = join(
        outputDir,
        task.path === '/' ? 'index.html' : `${task.path.replace(/^\//, '')}/index.html`
      )
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, html)
      console.log(`✅ Rendered: ${task.path}`)
    } catch (e) {
      console.error(`❌ Error rendering ${task.path}:`, e)
    }
  }

  // Initialize Engine for Sitemap
  const engine = new SeoEngine({
    mode: 'incremental',
    baseUrl,
    resolvers: [],
    branding: { enabled: true, watermark: 'Powered by Gravito Luminosity' },
    incremental: {
      logDir: join(process.cwd(), '.luminosity'),
      compactInterval: 0,
    },
  })

  await engine.init()
  const strategy = engine.getStrategy()

  // Add All Routes to Sitemap Strategy
  for (const task of routes) {
    await strategy.add({
      url: task.meta.url,
      lastmod: new Date(),
      changefreq: task.path.includes('docs') ? 'weekly' : 'daily',
      priority: task.path === '/' ? 1.0 : 0.8,
    })
  }

  // Get Entries & Render
  const entries = await strategy.getEntries()
  const renderer = new SeoRenderer({
    baseUrl,
    branding: { enabled: true },
    resolvers: [],
    mode: 'incremental',
  })
  const sitemapXml = renderer.render(entries, `${baseUrl}/sitemap.xml`)

  await writeFile(join(outputDir, 'sitemap.xml'), sitemapXml)
  console.log('✅ Generated sitemap.xml')

  // Generate Robots.txt
  const robotsConfig = {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [],
      },
    ],
  }

  const robots = new RobotsBuilder(robotsConfig, baseUrl).build()

  await writeFile(join(outputDir, 'robots.txt'), robots)
  console.log('✅ Generated robots.txt')

  // 5. Generate 404.html for GitHub Pages support
  console.log('🚫 Generating 404.html...')
  try {
    const res = await (core.app as Photon).request('/__404_gen__')
    let html = await res.text()

    const spaScript = `
    <script>
      (function() {
        const path = window.location.pathname;
        if (path === '/404.html' || path.endsWith('/404.html')) return;
        
        function tryLoad(p, cb) {
          const h = p.endsWith('/') ? p + 'index.html' : p + '/index.html';
          fetch(h).then(r => r.ok ? r.text() : Promise.reject()).then(t => cb(null, t))
            .catch(() => {
              const a = p + '.html';
              fetch(a).then(r => r.ok ? r.text() : Promise.reject()).then(t => cb(null, t)).catch(e => cb(e));
            });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
          tryLoad(path, (err, t) => {
            if (err) return;
            window.history.replaceState(null, '', path + window.location.search + window.location.hash);
            document.open(); document.write(t); document.close();
          });
        });
      })();
    </script>`

    html = html.replace('</head>', `${spaScript}\n</head>`)
    await writeFile(join(outputDir, '404.html'), html)
    console.log('✅ 404.html generated')
  } catch (e) {
    console.warn('⚠️  404.html generation failed', e)
  }

  // CNAME
  await writeFile(join(outputDir, 'CNAME'), 'lux.gravito.dev')
  // .nojekyll
  await writeFile(join(outputDir, '.nojekyll'), '')

  // 6. Copy static assets
  console.log('📦 Copying static assets...')
  try {
    const staticDir = join(process.cwd(), 'static')
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    // Also copy favicon to root if exists
    try {
      await cp(join(staticDir, 'favicon.ico'), join(outputDir, 'favicon.ico'))
      await cp(join(staticDir, 'favicon.svg'), join(outputDir, 'favicon.svg'))
    } catch {}
  } catch (_e) {
    console.warn('⚠️  No static directory found or failed to copy.')
  }

  console.log('✅ SSG Build Complete!')
  process.exit(0)
}

build().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
