import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { generateI18nEntries, SitemapStream } from '@gravito/constellation'
import { StaticSiteGenerator } from '@gravito/prism'
import { Glob } from 'bun'
import { bootstrap } from './src/bootstrap.ts'

console.log('🏗️  Starting Refactored SSG Build for gravito.dev...')

const execAsync = promisify(exec)

async function build() {
  // 0. Build Client Assets
  console.log('⚡ Building client assets (Vite)...')
  await execAsync('bun run build:client')

  // Initialize Core
  const core = await bootstrap({ port: 3000 })
  const outputDir = join(process.cwd(), 'dist-static')
  const domain = 'https://gravito.dev'
  const locales = ['en', 'zh', 'zh-TW']

  await mkdir(outputDir, { recursive: true })

  const abstractRoutes = new Set<string>()
  abstractRoutes.add('/')
  abstractRoutes.add('/about')
  abstractRoutes.add('/features')
  abstractRoutes.add('/releases')
  abstractRoutes.add('/privacy')
  abstractRoutes.add('/terms')
  abstractRoutes.add('/docs')

  // Discover Docs
  const docsRoot = resolve(process.cwd(), '../../docs')
  const glob = new Glob('**/[a-z]*.md')
  for await (const file of glob.scan(docsRoot)) {
    if (file.startsWith('design/') || file.startsWith('internal/')) continue
    const slug = file.replace(/^[a-z-]+\//i, '').replace(/\.md$/, '')
    if (slug === 'guide/laravel-12-mvc-parity' || slug.includes('node_modules')) continue
    abstractRoutes.add(`/docs/${slug}`)
  }

  // Generate full list of localized paths
  const extraPaths: string[] = []
  const smStream = new SitemapStream({ baseUrl: domain })

  for (const abstractPath of abstractRoutes) {
    const entries = generateI18nEntries(abstractPath, locales, domain)
    if (abstractPath === '/') {
      // Root special case for x-default
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

  // Use Prism SSG Engine
  const ssg = new StaticSiteGenerator(core)
  console.log(`🚀 Exporting ${extraPaths.length} paths using Incremental Builder...`)

  await ssg.exportIncremental(outputDir, {
    baseUrl: domain,
    incremental: true,
    extraPaths,
  })

  // Post-processing: 404.html, CNAME, .nojekyll, Redirects
  console.log('🧹 Post-processing...')

  // 1. Generate 404.html (Fetch it from core)
  const res404 = await core.adapter.fetch(new Request('http://localhost/__force_404__'))
  let html404 = await res404.text()
  // Add SPA script (simplified here for brevity, keeping existing logic in spirit)
  const spaScript = `<script>(function(){const p=window.location.pathname;if(p==='/404.html')return;fetch(p.endsWith('/')?p+'index.html':p+'.html').then(r=>{if(r.ok)return r.text();throw 1}).then(h=>{document.open();document.write(h);document.close()}).catch(()=>{})})()</script>`
  html404 = html404.replace('</body>', `${spaScript}</body>`)
  await writeFile(join(outputDir, '404.html'), html404)

  // 2. CNAME & .nojekyll
  await writeFile(join(outputDir, 'CNAME'), 'gravito.dev')
  await writeFile(join(outputDir, '.nojekyll'), '')

  // 3. Sitemap (Constellation-powered)
  await writeFile(join(outputDir, 'sitemap.xml'), smStream.toXML())

  // 4. Assets
  const staticDir = join(process.cwd(), 'static')
  if (existsSync(staticDir)) {
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    // Copy root assets
    const rootAssets = [
      'favicon.ico',
      'site.webmanifest',
      'android-chrome-192x192.png',
      'apple-touch-icon.png',
    ]
    for (const a of rootAssets) {
      if (existsSync(join(staticDir, a))) await cp(join(staticDir, a), join(outputDir, a))
    }
  }

  // 5. Clean up favicon directory if created by mistake by SSG
  const faviconDir = join(outputDir, 'favicon.ico')
  if (
    existsSync(faviconDir) &&
    (await (await import('node:fs/promises')).stat(faviconDir)).isDirectory()
  ) {
    await rm(faviconDir, { recursive: true })
  }

  console.log('✅ SSG Build Complete!')
  process.exit(0)
}

build().catch(console.error)
