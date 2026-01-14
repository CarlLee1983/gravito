import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { SitemapStream } from '@gravito/constellation'
import type { PlanetCore } from '@gravito/core'
import { bootstrap } from './src/bootstrap'

console.log('🏗️  Starting Static Site Generation for zenith.gravito.dev...')

const execAsync = promisify(exec)

/**
 * Discover all routes from the router
 */
function discoverRoutes(_core: PlanetCore): string[] {
  const routes = new Set<string>()

  const knownRoutes = [
    '/',
    '/about',
    '/features',
    '/integrations',
    '/contact',
    '/privacy',
    '/terms',
    '/zh-TW',
    '/zh-TW/about',
    '/zh-TW/features',
    '/zh-TW/integrations',
    '/zh-TW/contact',
    '/zh-TW/privacy',
    '/zh-TW/terms',
  ]

  for (const route of knownRoutes) {
    routes.add(route)
  }

  return Array.from(routes)
}

async function build() {
  // Load environment variables
  const baseUrl = process.env.STATIC_SITE_BASE_URL || 'https://zenith.gravito.dev'
  const domain = new URL(baseUrl).hostname
  const staticDomains = process.env.STATIC_SITE_DOMAINS || ''

  // 0. Build Client Assets
  console.log('⚡ Building client assets (Vite)...')
  try {
    const viteEnv = {
      ...process.env,
      VITE_STATIC_SITE_DOMAINS: staticDomains,
    }
    await execAsync('bun run build:client', { env: viteEnv })
    console.log('✅ Client build complete.')
  } catch (e) {
    console.error('❌ Client build failed:', e)
    process.exit(1)
  }

  // Initialize Core without starting server
  const core = await bootstrap({ port: 3000 })

  const outputDir = join(process.cwd(), 'dist-static')

  console.log('📂 Current working directory:', process.cwd())
  console.log('📂 Output directory:', outputDir)
  console.log('🌐 Base URL:', baseUrl)

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })
  console.log('✅ Output directory created/verified')

  // Discover routes
  const routes = discoverRoutes(core)
  console.log(`📋 Discovered ${routes.length} routes:`, routes)

  // 3. Render Loop
  const smStream = new SitemapStream({ baseUrl })

  // Render root first
  console.log(`Render: / (Root)`)
  try {
    const res = await core.adapter.fetch(new Request('http://localhost/'))
    if (res.status === 200) {
      let html = await res.text()
      const gaId = process.env.VITE_GA_ID
      if (gaId) {
        console.log(`💉 Injecting GA Script: ${gaId.substring(0, 4)}***`)
        html = html.replace(
          '<!-- Google Analytics Placeholder -->',
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
           <script>
             window.dataLayer = window.dataLayer || [];
             function gtag(){dataLayer.push(arguments);}
             gtag('js', new Date());
             gtag('config', '${gaId}');
           </script>`
        )
      }
      const indexPath = join(outputDir, 'index.html')
      await writeFile(indexPath, html)
      smStream.add({ url: `${baseUrl}/`, priority: 1.0 })
      console.log('✅ Root index.html generated')
    } else {
      console.error(`❌ Failed to render root: HTTP ${res.status}`)
      throw new Error(`Failed to render root: HTTP ${res.status}`)
    }
  } catch (e) {
    console.error('❌ Error rendering root:', e)
    throw e
  }

  // Render other routes
  for (const route of routes) {
    if (route === '/') {
      continue
    }

    console.log(`Render: ${route}`)

    try {
      const res = await core.adapter.fetch(new Request(`http://localhost${route}`))
      if (res.status !== 200) {
        if (res.status === 302 || res.status === 301) {
          const location = res.headers.get('Location')
          console.log(`  ↪ Redirect to ${location}`)
          const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${location}" /></head></html>`
          const filePath = join(outputDir, route, 'index.html')
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, html)
          continue
        }
        console.error(`❌ Failed ${res.status}: ${route}`)
        continue
      }

      let html = await res.text()
      const gaId = process.env.VITE_GA_ID
      if (gaId) {
        html = html.replace(
          '<!-- Google Analytics Placeholder -->',
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
           <script>
             window.dataLayer = window.dataLayer || [];
             function gtag(){dataLayer.push(arguments);}
             gtag('js', new Date());
             gtag('config', '${gaId}');
           </script>`
        )
      }
      const pathname = route.replace(/\/$/, '') || '/'
      const filePath = join(outputDir, pathname, 'index.html')
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, html)
      smStream.add({ url: `${baseUrl}${pathname}`, priority: 0.8 })
    } catch (e) {
      console.error(`❌ Error rendering ${route}:`, e)
    }
  }

  // Generate sitemap
  const sitemapXml = smStream.toXML()
  await writeFile(join(outputDir, 'sitemap.xml'), sitemapXml)
  console.log('🗺️  Sitemap generated.')

  // Generate robots.txt
  console.log('🤖 Generating robots.txt...')
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`
  await writeFile(join(outputDir, 'robots.txt'), robotsTxt)
  console.log('✅ robots.txt generated.')

  // Copy static assets
  console.log('📦 Copying static assets...')
  const staticDir = join(process.cwd(), 'static')
  try {
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    console.log('✅ Static assets copied to static/')

    // Copy root assets from static to root
    const rootAssets = ['favicon.ico', 'favicon.png', 'favicon.svg']
    for (const asset of rootAssets) {
      try {
        await cp(join(staticDir, asset), join(outputDir, asset))
        console.log(`✅ Asset ${asset} copied to root`)
      } catch (_e) {
        // Skip if missing
      }
    }
  } catch (_e) {
    console.warn('⚠️  No static directory found or failed to copy.')
  }

  // Generate 404.html for GitHub Pages
  console.log('🚫 Generating 404.html...')
  try {
    const res = await core.adapter.fetch(
      new Request(`http://localhost/__force_404_generation_${Date.now()}__`)
    )
    let html = await res.text()

    const spaScript = `
    <script>
      // GitHub Pages SPA routing handler for Inertia.js
      (function() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;
        
        if (currentPath === '/404.html' || currentPath.endsWith('/404.html')) {
          return;
        }
        
        function tryLoadHtml(path, callback) {
          let htmlPath = path.endsWith('/') ? path + 'index.html' : path + '/index.html';
          
          fetch(htmlPath)
            .then(function(response) {
              if (response.ok) {
                return response.text();
              }
              if (htmlPath.endsWith('/index.html')) {
                const altPath = path + '.html';
                return fetch(altPath).then(function(altResponse) {
                  if (altResponse.ok) {
                    return altResponse.text();
                  }
                  throw new Error('Not found');
                });
              }
              throw new Error('Not found');
            })
            .then(function(html) {
              callback(null, html);
            })
            .catch(function(error) {
              callback(error, null);
            });
        }
        
        function handleRoute() {
          tryLoadHtml(currentPath, function(error, html) {
            if (error || !html) {
              console.log('Route not found:', currentPath);
              return;
            }
            window.history.replaceState(null, '', currentPath + currentSearch + currentHash);
            document.open();
            document.write(html);
            document.close();
          });
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', handleRoute);
        } else {
          handleRoute();
        }
      })();
    </script>`

    if (html.includes('</body>')) {
      html = html.replace(
        '</body>',
        `
${spaScript}
</body>`
      )
    } else if (html.includes('</BODY>')) {
      html = html.replace(
        '</BODY>',
        `
${spaScript}
</BODY>`
      )
    } else {
      html = html.replace(
        '</html>',
        `
${spaScript}
</html>`
      )
    }

    await writeFile(join(outputDir, '404.html'), html)
    console.log('✅ 404.html generated with SPA routing support.')
  } catch (e) {
    console.error('❌ Failed to generate 404.html:', e)
  }

  // CNAME
  await writeFile(join(outputDir, 'CNAME'), domain)
  console.log(`✅ CNAME file created for: ${domain}`)

  await writeFile(join(outputDir, '.nojekyll'), '')
  console.log('✅ .nojekyll file created')

  console.log('✅ Static Site Build Complete!')
  process.exit(0)
}

build().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
