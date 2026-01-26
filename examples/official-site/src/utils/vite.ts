import type { GravitoContext, GravitoNext, PlanetCore } from '@gravito/core'

/**
 * Configure Vite proxy middleware for development mode
 */
export function setupViteProxy(core: PlanetCore): void {
  // Universal Vite Proxy
  const proxyToVite = async (c: GravitoContext) => {
    try {
      const url = new URL(c.req.url)

      const pathname = url.pathname.replace(/\/+/g, '/')
      const viteUrl = `http://127.0.0.1:5174${pathname}${url.search}`

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
            redirect: 'follow',
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

      if (response.status === 404) {
        // DEBUG: Return explicit 404 to verify connectivity
        return c.text(`[Vite Debug] 404 Not Found from Vite at ${viteUrl}`, 404)
      }

      if (!response.ok && response.status !== 304) {
        core.logger.warn(`[Vite Proxy] ${response.status} for: ${pathname}`)
        // Forward the error response from Vite
        return c.body(await response.arrayBuffer(), response.status as never)
      }

      // If 304, we don't need to read the body
      if (response.status === 304) {
        // Forward all headers from Vite
        response.headers.forEach((value, key) => {
          // Skip some headers that might cause issues
          if (
            ['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())
          ) {
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
        if (
          !['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())
        ) {
          responseHeaders.set(key, value)
        }
      })

      // Force correct Content-Type for JS modules and CSS
      const p = url.pathname
      const isViteSpecial = p.startsWith('/@')
      const isJSAsset = /\.(ts|tsx|js|jsx)$/.test(p) || p.includes('react-refresh')
      const isCSS = /\.css$/.test(p)

      if (isViteSpecial || isJSAsset) {
        responseHeaders.set('Content-Type', 'application/javascript')
      } else if (isCSS) {
        // In Vite dev mode, CSS imports are transformed to JS modules with HMR
        // So we should preserve the original Content-Type from Vite (usually text/javascript)
        // Only override if Vite returns something completely wrong
        const originalContentType = response.headers.get('content-type')
        if (
          !originalContentType ||
          (!originalContentType.includes('javascript') && !originalContentType.includes('css'))
        ) {
          // Fallback: if Vite doesn't provide a valid type, use text/javascript for CSS imports in dev mode
          responseHeaders.set('Content-Type', 'text/javascript')
        }
        // Otherwise, preserve Vite's Content-Type (usually text/javascript for CSS imports in dev mode)
      }

      // Return a RAW Web Response to bypass any Photon/Adapter body-shaping that defaults to octet-stream
      return new Response(buffer, {
        status: response.status,
        headers: responseHeaders,
      })
    } catch (error) {
      core.logger.error(`[Vite Proxy] Failed: ${error}`)
      return c.text('Vite dev server not available', 503)
    }
  }

  // Intercept all requests that look like Vite assets
  core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
    try {
      const url = new URL(c.req.url)
      const p = url.pathname

      if (p.startsWith('/static/') || p === '/favicon.ico') {
        if (next) {
          return await next()
        }
        return undefined
      }

      // Identifiers for Vite requests
      const isViteSpecial = p.startsWith('/@') // /@vite, /@react-refresh, /@fs, /@id
      const isNodeModules = p.startsWith('/node_modules')
      const isClientSource = p.startsWith('/src/client') || p.startsWith('/src') // general src
      const isClientRoot = p === '/app.tsx' || p === '/styles.css' || p === '/freeze.config.ts'

      // Extensions often requested by Vite
      const hasExtension = /\.(ts|tsx|js|jsx|css|json|wasm|png|jpg|jpeg|gif|svg|ico)$/.test(p)

      // Specific HMR helper
      const isReactRefresh = p.includes('react-refresh')

      const shouldProxy =
        isViteSpecial ||
        isNodeModules ||
        isClientSource ||
        isClientRoot ||
        hasExtension ||
        isReactRefresh ||
        p.endsWith('.tsx') ||
        p.endsWith('.ts') ||
        p.endsWith('.js')

      if (shouldProxy) {
        const result = await proxyToVite(c)
        if (result) {
          return result
        }
      }
    } catch (e) {
      console.error(`[Vite Proxy] Middleware error:`, e)
    }

    if (next) {
      return await next()
    }
    return undefined
  })
}
