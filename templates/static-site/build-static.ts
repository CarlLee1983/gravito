import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { SitemapStream } from '@gravito/constellation'
import type { PlanetCore } from 'gravito-core'
import { bootstrap } from './src/bootstrap.ts'

console.log('🏗️  Starting Static Site Generation...')

const execAsync = promisify(exec)

/**
 * Discover all routes from the router
 * This scans the router's internal route registry
 */
function discoverRoutes(core: PlanetCore): string[] {
  const routes = new Set<string>()

  // Get all registered routes from the router
  // The router stores routes in its internal structure
  const _router = core.router

  // Try to get routes from router's internal registry
  // This is a simplified approach - in production you might want to
  // maintain a routes manifest or use a route scanner
  const knownRoutes = ['/', '/about']

  // Add known routes
  for (const route of knownRoutes) {
    routes.add(route)
  }

  // You can extend this to scan your route files or maintain a routes manifest
  // For now, we'll use a simple approach and let users add routes manually

  return Array.from(routes)
}

async function build() {
  // Load environment variables
  const baseUrl = process.env.STATIC_SITE_BASE_URL || 'https://yourdomain.com'
  const domain = new URL(baseUrl).hostname
  const staticDomains = process.env.STATIC_SITE_DOMAINS || ''

  // 0. Build Client Assets
  // Inject environment variables for Vite (VITE_ prefix required)
  console.log('⚡ Building client assets (Vite)...')
  try {
    // Set Vite environment variables
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
    const res = await core.app.request('/')
    if (res.status === 200) {
      const html = await res.text()
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
      continue // Already handled
    }

    console.log(`Render: ${route}`)

    try {
      const res = await core.app.request(route)
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

      const html = await res.text()
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

  // Copy static assets
  console.log('📦 Copying static assets...')
  const staticDir = join(process.cwd(), 'static')
  try {
    await cp(staticDir, join(outputDir, 'static'), { recursive: true })
    console.log('✅ Static assets copied')
  } catch (_e) {
    console.warn('⚠️  No static directory found or failed to copy.')
  }

  // Generate 404.html for GitHub Pages
  console.log('🚫 Generating 404.html...')
  try {
    // Request a known non-existent route to trigger the 404 hook
    const res = await core.app.request(`/__force_404_generation_${Date.now()}__`)
    let html = await res.text()

    // Insert SPA routing script
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
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
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
      html = html.replace('</body>', `${spaScript}\n</body>`)
    } else if (html.includes('</BODY>')) {
      html = html.replace('</BODY>', `${spaScript}\n</BODY>`)
    } else {
      html = html.replace('</html>', `${spaScript}\n</html>`)
    }

    await writeFile(join(outputDir, '404.html'), html)
    console.log('✅ 404.html generated with SPA routing support.')
  } catch (e) {
    console.error('❌ Failed to generate 404.html:', e)
  }

  // Generate GitHub Pages files
  if (domain && domain !== 'yourdomain.com') {
    await writeFile(join(outputDir, 'CNAME'), domain)
    console.log('✅ CNAME file created')
  }

  await writeFile(join(outputDir, '.nojekyll'), '')
  console.log('✅ .nojekyll file created')

  console.log('✅ Static Site Build Complete!')
  console.log(`📦 Output directory: ${outputDir}`)
  console.log(`🚀 Preview with: cd dist-static && npx serve .`)
  process.exit(0)
}

build().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
