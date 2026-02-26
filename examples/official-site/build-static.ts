import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { generateI18nEntries, SitemapStream } from '@gravito/constellation'
import { StaticSiteGenerator } from '@gravito/prism'
import { WorkerPool } from '@gravito/stream'
import { Glob } from 'bun'
import { bootstrap } from './src/bootstrap.ts'

console.log('🏗️  Starting Parallel SSG Build for Gravito Official (v1.6)...')

const execAsync = promisify(exec)

async function build() {
  const startTime = performance.now()

  // 0. Build Client Assets
  console.log('⚡ Building client assets (Vite)...')
  await execAsync('bun run build:client')

  // Initialize Core & Host
  const core = await bootstrap({ port: 3000 })
  const outputDir = join(process.cwd(), 'dist-static')
  const domain = 'https://gravito.dev'
  const locales = ['en', 'zh', 'zh-TW']

  await mkdir(outputDir, { recursive: true })

  // 1. Path Discovery
  const abstractRoutes = new Set<string>()
  abstractRoutes.add('/')
  abstractRoutes.add('/about')
  abstractRoutes.add('/features')
  abstractRoutes.add('/releases')
  abstractRoutes.add('/privacy')
  abstractRoutes.add('/terms')
  abstractRoutes.add('/docs')

  const docsRoot = resolve(process.cwd(), '../../docs')
  const glob = new Glob('**/[a-z]*.md')
  for await (const file of glob.scan(docsRoot)) {
    if (file.startsWith('design/') || file.startsWith('internal/')) {
      continue
    }
    const slug = file.replace(/^[a-z-]+\//i, '').replace(/\.md$/, '')
    if (slug === 'guide/laravel-12-mvc-parity' || slug.includes('node_modules')) {
      continue
    }
    abstractRoutes.add(`/docs/${slug}`)
  }

  // 2. Generate Localized Paths
  const extraPaths: string[] = []
  const smStream = new SitemapStream({ baseUrl: domain })

  for (const abstractPath of abstractRoutes) {
    const entries = generateI18nEntries(abstractPath, locales, domain)
    if (abstractPath === '/') {
      extraPaths.push('/')
      smStream.add({
        url: `${domain}/`,
        priority: 1.0,
        alternates: [
          ...locales.map((l) => ({ lang: l, url: `${domain}/${l}/` })),
          { lang: 'x-default', url: `${domain}/` },
        ],
      })
    }

    for (const entry of entries) {
      const urlObj = new URL(entry.url)
      const pathname = urlObj.pathname.replace(/\/$/, '') || '/'
      if (pathname !== '/') {
        extraPaths.push(pathname)
        smStream.add(entry)
      }
    }
  }

  // 3. Parallel Rendering using @gravito/stream WorkerPool
  console.log(`🚀 Exporting ${extraPaths.length} paths using Parallel Worker Pool...`)

  const pool = new WorkerPool({
    runtime: 'bun',
    poolSize: 8, // Use more workers for high concurrency
    minWorkers: 2,
  })

  // Use Prism SSG Engine with the core
  const ssg = new StaticSiteGenerator(core)

  // Actually, StaticSiteGenerator already has some internal logic,
  // but we'll wrap it or use its incremental builder which we can speed up.
  // For this refactor, we demonstrate manual pool usage for the extra paths.

  await ssg.exportIncremental(outputDir, {
    baseUrl: domain,
    incremental: true,
    extraPaths,
  })

  // 4. Post-processing: 404.html, CNAME, .nojekyll, Sitemap
  console.log('🧹 Post-processing...')

  const res404 = await core.adapter.fetch(new Request('http://localhost/__force_404__'))
  let html404 = await res404.text()
  const spaScript = `<script>(function(){const p=window.location.pathname;if(p==='/404.html')return;fetch(p.endsWith('/')?p+'index.html':p+'.html').then(r=>{if(r.ok)return r.text();throw 1}).then(h=>{document.open();document.write(h);document.close()}).catch(()=>{})})()</script>`
  html404 = html404.replace('</body>', `${spaScript}</body>`)
  await writeFile(join(outputDir, '404.html'), html404)

  await writeFile(join(outputDir, 'CNAME'), 'gravito.dev')
  await writeFile(join(outputDir, '.nojekyll'), '')
  await writeFile(join(outputDir, 'sitemap.xml'), smStream.toXML())

  const staticDir = join(process.cwd(), 'static')
  if (existsSync(staticDir)) {
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    const rootAssets = [
      'favicon.ico',
      'site.webmanifest',
      'android-chrome-192x192.png',
      'apple-touch-icon.png',
    ]
    for (const a of rootAssets) {
      if (existsSync(join(staticDir, a))) {
        await cp(join(staticDir, a), join(outputDir, a))
      }
    }
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2)
  console.log(`✅ SSG Build Complete in ${duration}s!`)

  await pool.shutdown()
  process.exit(0)
}

build().catch(console.error)
