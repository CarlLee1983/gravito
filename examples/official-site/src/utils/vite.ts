import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'

/**
 * Configure Vite proxy middleware for development mode
 */
export function setupViteProxy(core: PlanetCore): void {
  // Universal Vite Proxy
  const proxyToVite = async (c: Context) => {
    try {
      const url = new URL(c.req.url)

      // Fix: When proxying, we might need to adjust the path if Hono's router captured differently
      // But for global middleware or wildcard, url.pathname is correct.

      const viteUrl = `http://127.0.0.1:5173${url.pathname}${url.search}`

      // Pass original headers (important for Accept, etc.)
      const headers = new Headers(c.req.header())
      headers.delete('host') // Let fetch set the correct host

      // Simple retry logic for when Vite is just starting up
      let response: Response
      let retries = 0
      while (true) {
        try {
          response = await fetch(viteUrl, {
            headers,
            method: c.req.method,
          })
          break // Success
        } catch (e) {
          retries++
          if (retries > 3) {
            throw e // Give up after 3 tries
          }
          await new Promise((resolve) => setTimeout(resolve, 100)) // Wait 100ms
        }
      }

      if (!response.ok) {
        // Only log if it's not a 404 (Vite might return 404 for valid reasons like missing map files)
        if (response.status !== 404) {
          core.logger.warn(`[Vite Proxy] ${response.status} for: ${url.pathname}`)
        }
        // Forward the error response from Vite
        return c.body(await response.arrayBuffer(), response.status as any)
      }

      const contentType = response.headers.get('Content-Type') || 'text/javascript'
      const buffer = await response.arrayBuffer() // Use arrayBuffer to support binary assets (images, etc.)

      // Set appropriate headers
      c.header('Content-Type', contentType)
      const cacheControl = response.headers.get('Cache-Control')
      if (cacheControl) {
        c.header('Cache-Control', cacheControl)
      }
      const etag = response.headers.get('ETag')
      if (etag) {
        c.header('ETag', etag)
      }

      // Fix for specific Hono/Bun behavior with standard Response vs Hono Body
      return c.body(buffer, response.status as any)
    } catch (error) {
      core.logger.error(`[Vite Proxy] Failed: ${error}`)
      return c.text('Vite dev server not available', 503)
    }
  }

  // Intercept all requests that look like Vite assets
  // We use a global middleware pattern but conditionally execute to avoid interfering with API/HTML routes if possible.
  // However, Hono's order matters. This is installed AFTER static files but BEFORE other routes in bootstrap.

  core.app.use('*', async (c, next) => {
    const url = new URL(c.req.url)
    const p = url.pathname

    // Identifiers for Vite requests
    const isViteSpecial = p.startsWith('/@') // /@vite, /@react-refresh, /@fs, /@id
    const isNodeModules = p.startsWith('/node_modules')
    const isClientSource = p.startsWith('/src/client') || p.startsWith('/src') // general src
    const isClientRoot = p === '/app.tsx' || p === '/styles.css'

    // Extensions often requested by Vite
    const hasExtension = /\.(ts|tsx|js|jsx|css|json|wasm|png|jpg|jpeg|gif|svg|ico)$/.test(p)

    // Specific HMR helper
    const isReactRefresh = p.includes('react-refresh')

    if (
      isViteSpecial ||
      isNodeModules ||
      isClientSource ||
      isClientRoot ||
      hasExtension ||
      isReactRefresh
    ) {
      // If it overlaps with a registered route (like /api), we might want to be careful.
      // But in this architecture, client assets take precedence in dev mode if they exist in Vite.
      return proxyToVite(c)
    }

    await next()
  })
}
