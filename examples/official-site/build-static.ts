import { exec } from 'node:child_process'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { generateI18nEntries, SitemapStream } from '@gravito/constellation'
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

  // Debug: Log working directory and output directory
  console.log('📂 Current working directory:', process.cwd())
  console.log('📂 Output directory:', outputDir)

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })
  console.log('✅ Output directory created/verified')

  const routes = new Set<string>()

  // 1. Static Routes
  routes.add('/')
  routes.add('/about')
  routes.add('/docs') // This will generate a redirect to /docs/guide/core-concepts

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
  console.log('🌐 Making request to root path...')
  try {
    const res = await (core.app as any).request('/')
    console.log(`📡 Response status: ${res.status}`)
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

      const indexPath = join(outputDir, 'index.html')
      console.log('📝 Writing index.html to:', indexPath)
      await writeFile(indexPath, finalHtml)
      smStream.add({ url: `${domain}/`, priority: 1.0 })
      console.log('✅ Root index.html generated at:', indexPath)

      // Verify file was written
      const { stat } = await import('node:fs/promises')
      const stats = await stat(indexPath)
      console.log('✅ Verified: index.html exists, size:', stats.size, 'bytes')
    } else {
      console.error(`❌ Failed to render root: HTTP ${res.status}`)
      throw new Error(`Failed to render root: HTTP ${res.status}`)
    }
  } catch (e) {
    console.error('❌ Error rendering root:', e)
    throw e // Re-throw to ensure build fails if root page can't be generated
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
        const res = await (core.app as any).request(pathname)
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
    const res = await (core.app as any).request('/robots.txt')
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
  // GitHub Pages uses 404.html to handle SPA routing
  // When a route doesn't exist, GitHub Pages serves 404.html
  // We need to make 404.html try to load the corresponding HTML file
  console.log('🚫 Generating 404.html...')
  try {
    // Request a known non-existent route to trigger the 404 hook
    const res = await (core.app as any).request(`/__force_404_generation_${Date.now()}__`)
    let html = await res.text()

    // For GitHub Pages SPA support, we need to add a script that:
    // 1. Reads the current URL
    // 2. Tries to fetch the corresponding HTML file
    // 3. If found, replaces the current page content
    // 4. If not found, shows the 404 error

    // Insert a script before closing body tag to handle SPA routing
    const spaScript = `
    <script>
      // GitHub Pages SPA routing handler for Inertia.js
      (function() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;
        
        // Skip if we're already on a 404 page or if this is a direct 404.html request
        if (currentPath === '/404.html' || currentPath.endsWith('/404.html')) {
          return;
        }
        
        // Function to try loading HTML file
        function tryLoadHtml(path, callback) {
          // Try with trailing slash first (directory index)
          let htmlPath = path.endsWith('/') ? path + 'index.html' : path + '/index.html';
          
          fetch(htmlPath)
            .then(function(response) {
              if (response.ok) {
                return response.text();
              }
              // If not found, try without trailing slash
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
        
        // Wait for Inertia to be initialized
        function handleRoute() {
          tryLoadHtml(currentPath, function(error, html) {
            if (error || !html) {
              // Route not found, show 404
              console.log('Route not found:', currentPath);
              return;
            }
            
            // Parse the HTML and extract the data-page attribute
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const appDiv = doc.querySelector('#app');
            
            // For static deployment, the simplest approach is to replace the entire page
            // This ensures Inertia.js re-initializes with the correct data-page attribute
            // Update URL first
            window.history.replaceState(null, '', currentPath + currentSearch + currentHash);
            
            // Replace the entire document to trigger Inertia re-initialization
            document.open();
            document.write(html);
            document.close();
          });
        }
        
        // Try to handle route immediately
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', handleRoute);
        } else {
          handleRoute();
        }
      })();
    </script>`

    // Insert the script before the closing body tag
    // Use a more reliable method to find and replace </body>
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${spaScript}\n</body>`)
    } else if (html.includes('</BODY>')) {
      html = html.replace('</BODY>', `${spaScript}\n</BODY>`)
    } else {
      // If no body tag found, append before closing html tag
      html = html.replace('</html>', `${spaScript}\n</html>`)
    }

    await writeFile(join(outputDir, '404.html'), html)
    console.log('✅ 404.html generated with SPA routing support.')
  } catch (e) {
    console.error('❌ Failed to generate 404.html:', e)
  }

  // CNAME (Note: Ensure this matches your production domain)
  await writeFile(join(outputDir, 'CNAME'), 'gravito.dev')

  // .nojekyll
  await writeFile(join(outputDir, '.nojekyll'), '')

  // Create redirect for /docs to /en/docs/guide/core-concepts
  console.log('🔄 Creating /docs redirect...')
  const docsRedirectHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/en/docs/guide/core-concepts" /><script>window.location.href='/en/docs/guide/core-concepts';</script></head><body>Redirecting to <a href="/en/docs/guide/core-concepts">/en/docs/guide/core-concepts</a>...</body></html>`
  await mkdir(join(outputDir, 'docs'), { recursive: true })
  await writeFile(join(outputDir, 'docs', 'index.html'), docsRedirectHtml)
  console.log('✅ /docs redirect created')

  // Create redirect for /about to /en/about
  console.log('🔄 Creating /about redirect...')
  const aboutRedirectHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/en/about" /><script>window.location.href='/en/about';</script></head><body>Redirecting to <a href="/en/about">/en/about</a>...</body></html>`
  await mkdir(join(outputDir, 'about'), { recursive: true })
  await writeFile(join(outputDir, 'about', 'index.html'), aboutRedirectHtml)
  console.log('✅ /about redirect created')

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

build().catch((error) => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})
