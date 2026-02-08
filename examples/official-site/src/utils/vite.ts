import type { GravitoContext, PlanetCore } from '@gravito/core'

/**
 * Universal Vite Proxy logic
 */
export async function proxyToVite(
  c: GravitoContext,
  core: PlanetCore
): Promise<Response | undefined> {
  try {
    const url = new URL(c.req.url)
    const pathname = url.pathname.replace(/\/+/g, '/')
    const viteUrl = `http://127.0.0.1:5174${pathname}${url.search}`

    // Copy headers but omit host and other potentially problematic ones
    const headers = new Headers()
    const originalHeaders = (c.req as any).header ? c.req.header() : {}

    if (originalHeaders) {
      for (const [key, value] of Object.entries(originalHeaders)) {
        if (value && !['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
          headers.set(key, value as string)
        }
      }
    }

    // Explicitly set host to 127.0.0.1:5174 to satisfy Vite's security checks
    headers.set('Host', '127.0.0.1:5174')

    const response = await fetch(viteUrl, {
      headers,
      method: c.req.method,
      redirect: 'manual',
    })

    if (response.status === 404) {
      return undefined
    }

    const buffer = await response.arrayBuffer()
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (
        !['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())
      ) {
        responseHeaders.set(key, value)
      }
    })

    // Force correct Content-Type for key assets
    if (pathname.endsWith('.tsx') || pathname.endsWith('.ts')) {
      responseHeaders.set('Content-Type', 'application/javascript')
    }

    return new Response(buffer, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    core.logger.error(`[Vite Proxy] Failed for ${c.req.url}: ${error.message}`)
    return new Response(`Vite dev server not available: ${error.message}`, { status: 503 })
  }
}

/**
 * Configure Vite proxy middleware for development mode
 */
export function setupViteProxy(core: PlanetCore): void {
  const app = (core as any).app
  if (!app) {
    return
  }

  // Register as a regular route to ensure priority over static handlers
  const vitePatterns = [
    '/@vite/*',
    '/@react-refresh',
    '/@fs/*',
    '/@id/*',
    '/node_modules/*',
    '/src/client/*',
    '/app.tsx',
    '/styles.css',
    '/freeze.config.ts',
  ]

  vitePatterns.forEach((pattern) => {
    app.all(pattern, async (c: any) => {
      const result = await proxyToVite(c, core)
      if (result) {
        return result
      }
      return c.notFound()
    })
  })
}
