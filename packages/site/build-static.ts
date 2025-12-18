import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { ContentManager } from '@gravito/orbit-content'
import { generateI18nEntries, SitemapStream, streamToPromise } from '@gravito/orbit-sitemap'
import { app } from './src/index.ts'

async function build() {
  console.log('🏗️  Starting SSG Build for gravito.dev...')

  const outputDir = join(process.cwd(), 'packages/site/dist-static')
  const locales = ['en', 'zh']
  const domain = 'https://gravito.dev'

  // Sitemap Stream
  const smStream = new SitemapStream({ hostname: domain })

  // Abstract Path Discovery
  // We scan EN content and assume it exists for ZH too (or we could scan both)
  const routes = new Set<string>()

  // 1. Static Pages
  routes.add('/')

  // 2. Dynamic Docs
  // Use local content manager for discovery (CWD is site root)
  const contentManager = new ContentManager(process.cwd())
  contentManager.defineCollection('docs', { path: 'resources/content/docs' })

  console.log('🔍 Scanning docs...')
  const docs = await contentManager.list('docs', 'en')
  for (const doc of docs) {
    routes.add(`/docs/${doc.slug}`)
  }

  console.log(`📋 Found ${routes.size} unique page types.`)

  // 3. Render Loop
  for (const abstractPath of routes) {
    // Generate I18n Entries (One for each locale)
    const entries = generateI18nEntries(abstractPath, locales, domain)

    for (const entry of entries) {
      // Write to sitemap
      smStream.write(entry)

      // Render HTML
      const relativeUrl = new URL(entry.url).pathname // e.g., /en/docs/intro
      console.log(`Render: ${relativeUrl}`)

      try {
        const res = await app.app.request(relativeUrl)
        if (res.status !== 200) {
          console.error(`❌ Failed ${res.status}: ${relativeUrl}`)
          continue
        }
        const html = await res.text()

        const filePath = join(outputDir, relativeUrl, 'index.html')
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, html)
      } catch (e) {
        console.error(`❌ Error rendering ${relativeUrl}:`, e)
      }
    }
  }

  // 4. Finish Sitemap
  smStream.end()
  const sitemapXml = await streamToPromise(smStream)
  await writeFile(join(outputDir, 'sitemap.xml'), sitemapXml)
  console.log('🗺️  Sitemap generated.')

  // 5. CNAME
  await writeFile(join(outputDir, 'CNAME'), 'gravito.dev')

  // 6. .nojekyll
  await writeFile(join(outputDir, '.nojekyll'), '')

  // 7. Root Redirect
  const rootHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/en/" /></head></html>`
  await writeFile(join(outputDir, 'index.html'), rootHtml)

  console.log('✅ SSG Build Complete! Output: dist-static')
  process.exit(0)
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
