import { resolve } from 'node:path'
import type { GravitoOrbit, PlanetCore, ViewService } from 'gravito-core'
import { createImageHelper } from './helpers/image'
import { TemplateEngine } from './TemplateEngine'

export class OrbitPrism implements GravitoOrbit {
  /**
   * Install the orbit into the PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitPrism] Initializing View Engine (Exposed as: view)')

    // 1. Resolve Views Directory
    // Default to 'src/views' relative to CWD
    const configuredPath = core.config.get<string>('VIEW_DIR', 'src/views')
    const viewsDir = resolve(process.cwd(), configuredPath)

    // 2. Initialize Engine
    const engine = new TemplateEngine(viewsDir)

    // 3. Register Built-in Helpers
    engine.registerHelper('image', createImageHelper())

    // 4. Inject into Context via Middleware
    core.adapter.use('*', async (c, next) => {
      c.set('view', engine)
      await next()
      return undefined
    })

    // 5. Trigger hook for additional helper registration
    core.hooks.doAction('view:helpers:register', engine)
  }
}

export type { ViewService }
export { TemplateEngine }
export { Image, type ImageProps } from './components/Image'
export { createImageHelper } from './helpers/image'
export { type ImageOptions, ImageService } from './ImageService'
