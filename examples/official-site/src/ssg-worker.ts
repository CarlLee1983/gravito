import { bootstrap } from './bootstrap'

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
      // 1. Boot a minimal core for rendering if not already provided
      // In a real worker, we might want to keep the core hot
      const core = await bootstrap({ port: 0 })

      const response = await core.adapter.fetch(new Request(`http://localhost${path}`))
      const html = await response.text()

      return new Response(JSON.stringify({ html, status: response.status }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Invalid task', { status: 400 })
  },
}
