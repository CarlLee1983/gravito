import { resolve } from 'node:path'
import type { GravitoOrbit, PlanetCore, ViewService } from 'gravito-core'
import { TemplateEngine } from './TemplateEngine'

export class OrbitView implements GravitoOrbit {
  /**
   * Install the orbit into the PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitView] Initializing View Engine (Exposed as: view)')

    // 1. Resolve Views Directory
    // Default to 'src/views' relative to CWD
    const configuredPath = core.config.get<string>('VIEW_DIR', 'src/views')
    const viewsDir = resolve(process.cwd(), configuredPath)

    // 2. Initialize Engine
    const engine = new TemplateEngine(viewsDir)

    // 3. Inject into Context via Middleware
    core.app.use('*', async (c, next) => {
      c.set('view', engine)
      await next()
    })

    // 4. Register Helpers (Optional)
    // Maybe we can add a global hook to inject common data?
    // For example, 'page:rendering' hook
  }
}

export type { ViewService }
export { TemplateEngine }
