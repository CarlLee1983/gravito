import { resolve } from 'node:path'
import type {
  GravitoContext,
  GravitoNext,
  GravitoOrbit,
  PlanetCore,
  ViewService,
} from '@gravito/core'
import { createImageHelper } from './helpers/image'
import { TemplateEngine } from './TemplateEngine'

/**
 * OrbitPrism provides a flexible template rendering engine for Gravito.
 *
 * It integrates with PlanetCore to provide a full-featured view engine with:
 * - Blade-like syntax (@extends, @section, @yield).
 * - Component-based UI building (<x-component>).
 * - Built-in performance optimizations for images.
 * - Automatic middleware injection (exposed as `c.get('view')`).
 *
 * @example
 * ```typescript
 * import { OrbitPrism } from '@gravito/prism';
 *
 * const prism = new OrbitPrism();
 * core.addOrbit(prism);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitPrism implements GravitoOrbit {
  /**
   * Install the orbit into the PlanetCore.
   * Resolves the views directory, registers helpers, and injects the engine into the context.
   *
   * @param core - The PlanetCore instance.
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
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('view', engine)
      return await next()
    })

    // 5. Register in core container for global access (CLI, Jobs)
    core.container.instance('view', engine)

    // 6. Trigger hook for additional helper registration
    core.hooks.doAction('view:helpers:register', engine)
  }
}

// Module augmentation for GravitoVariables (abstraction layer)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** View engine for rendering templates */
    view?: TemplateEngine
  }
}

export type { ViewService }
export { TemplateEngine }
export { Image, type ImageProps } from './components/Image'
export { createImageHelper } from './helpers/image'
export { type ImageOptions, ImageService } from './ImageService'
export { StaticSiteGenerator } from './SSG'
