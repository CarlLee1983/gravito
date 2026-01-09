import type { GravitoContext, GravitoNext, PlanetCore } from '@gravito/core'
import { setupViteProxy } from './vite'

export function setupDevelopmentEnvironment(core: PlanetCore) {
  // Serve uploads explicitly using Bun.file()
  core.adapter.route('get', '/uploads/:filename', async (c: GravitoContext) => {
    const filename = c.req.param('filename') || ''
    // Prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return c.text('Forbidden', 403)
    }

    const filePath = `./static/uploads/${filename}`
    const file = Bun.file(filePath)

    if (await file.exists()) {
      return new Response(file)
    }
    return c.text('Not found', 404)
  })

  setupViteProxy(core)

  core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
    c.set('isDev', true)
    return (await next()) as any
  })
}
