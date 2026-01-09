import type { GravitoContext, GravitoNext, PlanetCore } from '@gravito/core'

/**
 * Setup Vite Proxy for development
 */
export function setupViteProxy(core: PlanetCore): void {
  const proxyToVite = async (c: GravitoContext) => {
    try {
      const url = new URL(c.req.url)
      const viteUrl = `http://127.0.0.1:5174${url.pathname}${url.search}`

      const headers = new Headers(c.req.header())
      headers.delete('host')

      let response: Response
      let retries = 0
      while (true) {
        try {
          response = await fetch(viteUrl, {
            headers,
            method: c.req.method,
          })
          break
        } catch (e) {
          retries++
          if (retries > 3) {
            throw e
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      if (!response.ok && response.status !== 304) {
        if (response.status !== 404) {
          core.logger.warn(`[Vite Proxy] ${response.status} for: ${url.pathname}`)
        }
        return c.body(await response.arrayBuffer(), response.status as never)
      }

      if (response.status === 304) {
        response.headers.forEach((value, key) => {
          if (
            !['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())
          ) {
            c.header(key, value)
          }
        })
        return c.body(null, 304)
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

      const p = url.pathname
      const isViteSpecial = p.startsWith('/@')
      const isJSAsset = /\.(ts|tsx|js|jsx|vue)$/.test(p)

      if (isViteSpecial || isJSAsset) {
        responseHeaders.set('Content-Type', 'application/javascript')
      }

      return new Response(buffer, {
        status: response.status,
        headers: responseHeaders,
      })
    } catch (error) {
      core.logger.error(`[Vite Proxy] Failed: ${error}`)
      return c.text('Vite dev server not available', 503)
    }
  }

  core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
    const url = new URL(c.req.url)
    const p = url.pathname

    const isViteSpecial = p.startsWith('/@')
    const isNodeModules = p.startsWith('/node_modules')
    const isClientSource = p.startsWith('/src/client') || p.startsWith('/src')
    const hasExtension = /\.(ts|tsx|js|jsx|vue|css|json|wasm|png|jpg|jpeg|gif|svg|ico)$/.test(p)
    const isUpload = p.startsWith('/uploads/')

    if ((isViteSpecial || isNodeModules || isClientSource || hasExtension) && !isUpload) {
      return proxyToVite(c)
    }

    await next()
  })
}
