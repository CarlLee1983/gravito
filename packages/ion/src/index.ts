/**
 * @fileoverview Orbit Inertia - Inertia.js integration for Gravito
 *
 * Provides server-side Inertia.js integration for building modern
 * single-page applications with server-side routing.
 *
 * @module @gravito/ion
 * @since 1.0.0
 */

import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { InertiaService } from './InertiaService'

export * from './errors'
export * from './InertiaService'

/**
 * InertiaHelper is a callable function and service suite injected into the Gravito context.
 * It allows you to render Inertia components directly or manage shared data.
 *
 * @example
 * ```typescript
 * // Direct call rendering
 * return ctx.get('inertia')('Welcome', { user });
 *
 * // Using shared data
 * ctx.get('inertia').share('appName', 'Gravito App');
 * ```
 * @public
 */
export interface InertiaHelper {
  /**
   * Render an Inertia component.
   * Shortcut for context.get('inertia').render()
   *
   * @param component - The name of the frontend component (e.g., 'Pages/Home')
   * @param props - Data to pass to the component
   * @param rootVars - Variables for the root HTML template (e.g., meta tags)
   */
  <T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Response

  /** Share data with all Inertia responses for the remainder of the request */
  share(key: string, value: unknown): void

  /** Share multiple props at once */
  shareAll(props: Record<string, unknown>): void

  /** Get all currently shared props */
  getSharedProps(): Record<string, unknown>

  /** Explicitly render an Inertia component */
  render<T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Response

  /** Direct access to the low-level Inertia service instance */
  service: InertiaService
}

/**
 * Options for configuring OrbitIon.
 * @public
 */
export interface OrbitIonOptions {
  /** Current asset version to detect staleness (X-Inertia-Version) */
  version?: string
  /** The root HTML template view (default: 'app') */
  rootView?: string
}

/**
 * OrbitIon provides official Inertia.js integration for Gravito.
 *
 * It handles Inertia requests, partial reloads, asset versioning, and seamless
 * data sharing between the server and your frontend application (React, Vue, etc.).
 *
 * It injects an `InertiaHelper` into the context, allowing you to render
 * components with a simple function call: `c.get('inertia')('Page', { props })`.
 *
 * @example
 * ```typescript
 * import { OrbitIon } from '@gravito/ion';
 *
 * core.addOrbit(new OrbitIon({
 *   version: '1.0.0',
 *   rootView: 'app'
 * }));
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitIon implements GravitoOrbit {
  constructor(private options: OrbitIonOptions = {}) {}

  /**
   * Install the inertia orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed (Callable Interface)')

    const appVersion = this.options.version ?? core.config.get('APP_VERSION', '1.0.0')
    const rootView = this.options.rootView ?? 'app'

    // Register middleware to inject Inertia helper
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      const service = new InertiaService(c, {
        version: String(appVersion),
        rootView,
      })

      // Create a callable function that delegates to service.render
      const inertiaProxy = (
        component: string,
        props: Record<string, unknown> = {},
        rootVars: Record<string, unknown> = {},
        status?: number
      ) => {
        return service.render(component, props, rootVars, status)
      }

      // Attach methods to the function to allow advanced usage (share, etc.)
      Object.assign(inertiaProxy, {
        share: service.share.bind(service),
        shareAll: service.shareAll.bind(service),
        getSharedProps: service.getSharedProps.bind(service),
        render: service.render.bind(service), // Also allow .render()
        service, // Access to the raw service instance
      })

      c.set('inertia', inertiaProxy as InertiaHelper)
      return await next()
    })
  }
}

/**
 * Default export for convenience
 */
export default OrbitIon
