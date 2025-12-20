import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { generateI18nEntries, SitemapStream } from '@gravito/orbit-sitemap'
import { Glob } from 'bun'
import { bootstrap } from './src/bootstrap.ts'

console.log('🏗️  Starting SSG Build for gravito.dev...')

const execAsync = promisify(exec)

async function build() {
  // 0. Build Client Assets
  console.log('⚡ Building client assets (Vite)...')
  try {
    await execAsync('bun run build:client')
    console.log('✅ Client build complete.')
  } catch (e) {
    console.error('❌ Client build failed:', e)
    process.exit(1)
  }

  // Initialize Core without starting server
  const core = await bootstrap({ port: 3000 })

  const outputDir = join(process.cwd(), 'dist-static')
  const domain = 'https://gravito.dev'
  const locales = ['en', 'zh']

  const routes = new Set<string>()

  // 1. Static Routes
  routes.add('/')
  routes.add('/about')

  // 2. Discover Docs
  const docsRoot = resolve(process.cwd(), '../../docs')
  // Scan 'en' as the source of truth for slugs
  const glob = new Glob('en/**/*.md')
  for await (const file of glob.scan(docsRoot)) {
    const slug = file.replace(/^en\//, '').replace(/\.md$/, '')
    routes.add(`/docs/${slug}`)
  }

  // 3. Render Loop
  const smStream = new SitemapStream({ baseUrl: domain })

  // We add the bare root '/' manually to the sitemap and render it
  // since generateI18nEntries only generates prefixed paths
  console.log(`Render: / (Root Default)`)
  try {
    const res = await core.app.request('/')
    if (res.status === 200) {
      const gaId = process.env.VITE_GA_ID
      const html = await res.text()
      const finalHtml = gaId
        ? html.replace(
            '<!-- Google Analytics Placeholder -->',
            `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
             <script>
               window.dataLayer = window.dataLayer || [];
               function gtag(){dataLayer.push(arguments);}
               gtag('js', new Date());
               gtag('config', '${gaId}');
             </script>`
          )
        : html

      await writeFile(join(outputDir, 'index.html'), finalHtml)
      smStream.add({ url: `${domain}/`, priority: 1.0 })
    }
  } catch (e) {
    console.error('❌ Error rendering root:', e)
  }

  for (const abstractPath of routes) {
    // generateI18nEntries generates:
    // / -> /en/, /zh/
    // /docs/foo -> /en/docs/foo, /zh/docs/foo
    const entries = generateI18nEntries(abstractPath, locales, domain)

    for (const entry of entries) {
      smStream.add(entry)

      const urlObj = new URL(entry.url)
      const pathname = urlObj.pathname.replace(/\/$/, '') || '/'

      // Skip root since we handled it above (if it was somehow in entries)
      if (pathname === '/') {
        continue
      }

      console.log(`Render: ${pathname}`)

      try {
        const res = await core.app.request(pathname)
        if (res.status !== 200) {
          if (res.status === 302 || res.status === 301) {
            const location = res.headers.get('Location')
            console.log(`  ↪ Redirect to ${location}`)
            const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${location}" /></head></html>`
            const filePath = join(outputDir, pathname, 'index.html')
            await mkdir(dirname(filePath), { recursive: true })
            await writeFile(filePath, html)
            continue
          }
          console.error(`❌ Failed ${res.status}: ${pathname}`)
          continue
        }

        const gaId = process.env.VITE_GA_ID
        const html = await res.text()
        const finalHtml = gaId
          ? html.replace(
              '<!-- Google Analytics Placeholder -->',
              `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
             <script>
               window.dataLayer = window.dataLayer || [];
               function gtag(){dataLayer.push(arguments);}
               gtag('js', new Date());
               gtag('config', '${gaId}');
             </script>`
            )
          : html

        // For paths like /en/docs/foo, we save to en/docs/foo/index.html
        const filePath = join(outputDir, pathname, 'index.html')
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, finalHtml)
      } catch (e) {
        console.error(`❌ Error rendering ${pathname}:`, e)
      }
    }
  }

  const sitemapXml = smStream.toXML()
  await writeFile(join(outputDir, 'sitemap.xml'), sitemapXml)
  console.log('🗺️  Sitemap generated.')

  // Copy static assets
  console.log('📦 Copying static assets...')

  // 1. Copy public assets (Vite build output)
  // Vite config: outDir: '../../static/build'
  // ../../static/build is relative to examples/official-site/src/client ??
  // No, vite.config.ts is at examples/official-site/
  // root: ./src/client
  // outDir: ../../static/build -> src/client/../../static/build -> examples/official-site/static/build
  // Let's copy from examples/official-site/static

  // Copy 'static' directory if exists
  const staticDir = join(process.cwd(), 'static')
  try {
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
  } catch (_e) {
    console.warn('⚠️  No static directory found or failed to copy.')
  }

  // 4. Fetch dynamic robots.txt
  console.log('🤖 Fetching robots.txt...')
  try {
    const res = await core.app.request('/robots.txt')
    if (res.status === 200) {
      const content = await res.text()
      await writeFile(join(outputDir, 'robots.txt'), content)
    } else {
      console.warn('⚠️  Could not fetch robots.txt')
    }
  } catch (e) {
    console.warn('⚠️  Error fetching robots.txt:', e)
  }

  // 5. Generate 404.html for GitHub Pages
  console.log('🚫 Generating 404.html...')
  try {
    // Request a known non-existent route to trigger the 404 hook
    const res = await core.app.request('/__force_404_generation__')
    const html = await res.text()
    // It might return 200 or 404 depending on how Inertia handles the render,
    // but the HTML content is what we want for the static fallback.
    await writeFile(join(outputDir, '404.html'), html)
    console.log('✅ 404.html generated.')
  } catch (e) {
    console.error('❌ Failed to generate 404.html:', e)
  }

  // CNAME (Note: Ensure this matches your production domain)
  await writeFile(join(outputDir, 'CNAME'), 'gravito.dev')

  // .nojekyll
  await writeFile(join(outputDir, '.nojekyll'), '')

  // Copy root assets (favicon, manifest) from static to root
  const rootAssets = [
    'favicon.ico',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'apple-touch-icon.png',
  ]
  for (const asset of rootAssets) {
    try {
      await cp(join(staticDir, asset), join(outputDir, asset))
    } catch (_e) {
      // Ignore if missing, strictly speaking
    }
  }

  console.log('✅ SSG Build Complete!')
  process.exit(0)
}

build().catch(console.error)
