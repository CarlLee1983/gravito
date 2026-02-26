import type { PlanetCore } from '@gravito/core'
import { bootstrap } from './bootstrap'

let coreInstance: PlanetCore | null = null

/**
 * SSG Render Worker
 * Handles individual page rendering in a separate process
 */
export default {
  async fetch(req: Request) {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const path = url.searchParams.get('path')

    if (type === 'render' && path) {
      if (!coreInstance) {
        // Boot a minimal core for rendering
        coreInstance = await bootstrap({ port: 0 })
      }

      const response = await coreInstance.adapter.fetch(new Request(`http://localhost${path}`))
      const html = await response.text()

      return new Response(
        JSON.stringify({
          html,
          status: response.status,
          path,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response('Invalid task', { status: 400 })
  },
}
