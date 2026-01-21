import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { serve } from 'bun'

const DEFAULT_PORT = 4174
const DIST_DIR = join(process.cwd(), 'dist-static')

console.log(`🚀 Starting local preview server for static build...`)
console.log(`📂 Serving directory: ${DIST_DIR}`)

function startServer(port: number, maxRetries = 10) {
  try {
    const server = serve({
      port,
      async fetch(req) {
        const url = new URL(req.url)
        const pathname = url.pathname

        // Detect Inertia XHR requests
        const isInertiaRequest = req.headers.get('x-inertia') === 'true'

        // 1. Try to find the exact file
        let filePath = join(DIST_DIR, pathname)

        try {
          const s = await stat(filePath)
          if (s.isDirectory()) {
            filePath = join(filePath, 'index.html')
          }
        } catch (_e) {
          // Check if adding .html helps (clean urls)
          try {
            const htmlPath = `${filePath}.html`
            await stat(htmlPath)
            filePath = htmlPath
          } catch (_e2) {
            // Return 404.html for SPA behavior
            filePath = join(DIST_DIR, '404.html')
          }
        }

        try {
          const file = await readFile(filePath)
          const contentType = getContentType(filePath)

          // 🔥 Magic: If it's an Inertia request and we are serving an HTML file,
          // extract the JSON state so Inertia can perform a smooth AJAX transition.
          if (isInertiaRequest && contentType === 'text/html') {
            const html = file.toString()
            // Match both single and double quotes
            const match = html.match(/data-page=["']([^"']+)["']/)
            if (match) {
              // Decode common HTML entities from the attribute value
              const json = match[1]
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&#39;/g, "'")

              return new Response(json, {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Inertia': 'true',
                  Vary: 'Accept',
                },
              })
            }
          }

          return new Response(file, {
            headers: {
              'Content-Type': contentType,
            },
          })
        } catch (_e) {
          return new Response('Not Found', { status: 404 })
        }
      },
    })

    console.log(`🌐 Preview available at: http://localhost:${port}`)
    return server
  } catch (e: any) {
    if (e.code === 'EADDRINUSE' && maxRetries > 0) {
      console.warn(`⚠️  Port ${port} is in use, trying ${port + 1}...`)
      return startServer(port + 1, maxRetries - 1)
    }
    console.error(`❌ Failed to start server on port ${port}:`, e.message)
    process.exit(1)
  }
}

function getContentType(path: string): string {
  if (path.endsWith('.html')) {
    return 'text/html'
  }
  if (path.endsWith('.js')) {
    return 'application/javascript'
  }
  if (path.endsWith('.css')) {
    return 'text/css'
  }
  if (path.endsWith('.png')) {
    return 'image/png'
  }
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  if (path.endsWith('.svg')) {
    return 'image/svg+xml'
  }
  if (path.endsWith('.json')) {
    return 'application/json'
  }
  if (path.endsWith('.ico')) {
    return 'image/x-icon'
  }
  return 'text/plain'
}

startServer(DEFAULT_PORT)
