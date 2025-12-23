import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
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

  // Render Routes
  const routes = ['/', '/features', '/docs/introduction', '/docs/getting-started']

  // 3. Render Loop
  for (const pathname of routes) {
    console.log(`Render: ${pathname}`)
    try {
      const res = await (core.app as any).request(pathname)
      if (res.status !== 200) {
        console.error(`❌ Failed ${res.status}: ${pathname}`)
        console.error(await res.text())
        continue
      }

      const html = await res.text()
      const filePath = join(outputDir, pathname === '/' ? 'index.html' : `${pathname}/index.html`)
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, html)
      console.log(`✅ Rendered: ${pathname}`)
    } catch (e) {
      console.error(`❌ Error rendering ${pathname}:`, e)
    }
  }

  // 4. Generate SEO Assets (Luminosity)
  console.log('🌟 Generating Sitemap & Robots via Luminosity...')

  // Dynamic import to avoid earlier execution issues if any
  const { SeoEngine, SeoRenderer, RobotsBuilder } = await import('@gravito/luminosity')
  const { DocsService } = await import('./src/services/DocsService')

  const baseUrl = 'https://lux.gravito.dev'

  // Initialize Engine
  const engine = new SeoEngine({
    mode: 'incremental',
    baseUrl,
    resolvers: [],
    branding: { enabled: true, watermark: 'Powered by Gravito Luminosity' },
    incremental: {
      logDir: join(process.cwd(), '.luminosity'),
      compactInterval: 0, // Disable auto compaction for build script
    },
  })

  await engine.init()
  const strategy = engine.getStrategy()

  // Add Static Routes
  const staticRoutes = ['/', '/features']
  for (const r of staticRoutes) {
    await strategy.add({
      url: baseUrl + r,
      lastmod: new Date(),
      changefreq: 'daily',
      priority: r === '/' ? 1.0 : 0.8,
    })
  }

  // Add Docs Routes
  const locales = ['en', 'zh']
  for (const locale of locales) {
    const sections = await DocsService.getSidebar(locale)
    for (const section of sections) {
      for (const item of section.items) {
        const fullUrl = baseUrl + item.href
        await strategy.add({
          url: fullUrl,
          lastmod: new Date(),
          changefreq: 'weekly',
          priority: 0.7,
        })
      }
    }
  }

  // Get Entries & Render
  const entries = await strategy.getEntries()
  const renderer = new SeoRenderer({
    baseUrl,
    branding: { enabled: true },
    resolvers: [],
    mode: 'incremental',
  })
  const sitemapXml = renderer.render(entries, baseUrl + '/sitemap.xml')

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
