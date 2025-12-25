import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { Hono } from 'hono'
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

  // Add Home (English)
  routes.push({
    path: '/',
    meta: {
      title: 'Luminosity - Atomic Sitemap Engine',
      description: 'High-performance, intelligent sitemap generation for modern web applications.',
      url: baseUrl,
    },
  })

  // Add Features (English)
  routes.push({
    path: '/features',
    meta: {
      title: 'Features - Luminosity',
      description:
        'Explore the powerful features of Luminosity: LSM Tree storage, Incremental Updates, and more.',
      url: `${baseUrl}/features`,
    },
  })

  // Add Docs Routes
  const locales = ['en', 'zh']
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
      const res = await (core.app as Hono).request(task.path)
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

  // 5. Copy static assets
  console.log('📦 Copying static assets...')
  try {
    const staticDir = join(process.cwd(), 'static')
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    // Also copy favicon to root
    await cp(join(staticDir, 'favicon.ico'), join(outputDir, 'favicon.ico'))
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
