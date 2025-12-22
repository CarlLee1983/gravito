import type { GravitoContext, GravitoNext, PlanetCore } from 'gravito-core'

/**
 * Configure Vite proxy middleware for development mode
 */
export function setupViteProxy(core: PlanetCore): void {
  // Universal Vite Proxy
  const proxyToVite = async (c: GravitoContext) => {
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

      if (!response.ok && response.status !== 304) {
        // Only log if it's not a 404
        if (response.status !== 404) {
          core.logger.warn(`[Vite Proxy] ${response.status} for: ${url.pathname}`)
        }
        // Forward the error response from Vite
        return c.body(await response.arrayBuffer(), response.status as never)
      }

      // If 304, we don't need to read the body
      if (response.status === 304) {
        // Forward all headers from Vite
        response.headers.forEach((value, key) => {
          // Skip some headers that might cause issues
          if (['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
            return
          }
          c.header(key, value)
        })
        return c.body(null, 304)
      }

      const buffer = await response.arrayBuffer()

      // Map headers for the final response
      const responseHeaders = new Headers()
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value)
        }
      })

      // Force correct Content-Type for JS modules
      const p = url.pathname
      const isViteSpecial = p.startsWith('/@')
      const isJSAsset = /\.(ts|tsx|js|jsx)$/.test(p) || p.includes('react-refresh')

      if (isViteSpecial || isJSAsset) {
        responseHeaders.set('Content-Type', 'application/javascript')
      }

      // Return a RAW Web Response to bypass any Hono/Adapter body-shaping that defaults to octet-stream
      return new Response(buffer, {
        status: response.status,
        headers: responseHeaders,
      }) as any
    } catch (error) {
      core.logger.error(`[Vite Proxy] Failed: ${error}`)
      return c.text('Vite dev server not available', 503)
    }
  }

  // Intercept all requests that look like Vite assets
  // We use a global middleware pattern but conditionally execute to avoid interfering with API/HTML routes if possible.
  // However, Hono's order matters. This is installed AFTER static files but BEFORE other routes in bootstrap.

  core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
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
