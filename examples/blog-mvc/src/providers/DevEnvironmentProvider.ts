/**
 * Development Environment Provider
 *
 * Sets up development-only features like Vite proxy and static file serving.
 * This provider is conditionally loaded only in development mode.
 *
 * Lifecycle:
 * - register(): N/A
 * - boot(): Setup dev environment
 */

import {
  type Container,
  type GravitoContext,
  type GravitoNext,
  type PlanetCore,
  ServiceProvider,
} from '@gravito/core'
import { setupViteProxy } from '../utils/vite'

export class DevEnvironmentProvider extends ServiceProvider {
  /**
   * No container bindings needed.
   */
  register(_container: Container): void {
    // Dev environment doesn't require container bindings
  }

  /**
   * Setup development environment.
   */
  boot(core: PlanetCore): void {
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

    // Setup Vite dev server proxy
    setupViteProxy(core)

    // Inject dev flag into context
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('isDev', true)
      return (await next()) as any
    })

    core.logger.info('🔧 Development environment ready')
  }
}
