import { resolve } from 'node:path'
import type {
  GravitoContext,
  GravitoNext,
  GravitoOrbit,
  PlanetCore,
  ViewService,
} from '@gravito/core'
import { createImageHelper } from './helpers/image'
import { type CacheOptions, TemplateEngine } from './TemplateEngine'

export interface OrbitPrismOptions {
  cache?: CacheOptions
}

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
  private options?: OrbitPrismOptions

  /**
   * Create a new OrbitPrism instance.
   *
   * @param options - Optional configuration for the orbit
   *
   * @example
   * ```typescript
   * const prism = new OrbitPrism({
   *   cache: {
   *     maxSize: 1000,
   *     enabled: process.env.NODE_ENV === 'production'
   *   }
   * });
   * ```
   *
   * @public
   * @since 3.0.0
   */
  constructor(options?: OrbitPrismOptions) {
    this.options = options
  }

  /**
   * Install the orbit into PlanetCore.
   *
   * This method is called by PlanetCore during the boot sequence.
   * It initializes the template engine, registers helpers, and sets up middleware.
   *
   * @param core - The PlanetCore instance
   *
   * @public
   * @since 3.0.0
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitPrism] Initializing View Engine (Exposed as: view)')

    const configuredPath = core.config.get<string>('VIEW_DIR', 'src/views')
    const viewsDir = resolve(process.cwd(), configuredPath)

    const engine = new TemplateEngine(viewsDir, this.options?.cache)

    engine.registerHelper('image', createImageHelper())

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('view', engine)
      return await next()
    })

    core.container.instance('view', engine)

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

export type { ViewService, CacheOptions }
export { TemplateEngine }
export { Image, type ImageProps } from './components/Image'
export { createImageHelper } from './helpers/image'
export { type ImageOptions, ImageService } from './ImageService'
export { StaticSiteGenerator } from './SSG'
