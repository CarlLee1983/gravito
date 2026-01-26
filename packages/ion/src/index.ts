/**
 * @fileoverview Orbit Inertia - Inertia.js integration for Gravito.
 *
 * This module provides the core Orbit definition and helper interfaces for
 * building modern single-page applications using server-side routing.
 *
 * @module @gravito/ion
 */

import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { InertiaService } from './InertiaService'

export * from './errors'
export * from './InertiaService'

/**
 * Enhanced helper interface for Inertia operations within the Gravito context.
 *
 * This interface is both a callable function for quick rendering and a
 * service container for managing shared data and accessing the underlying service.
 *
 * @example
 * ```typescript
 * // Direct rendering
 * return ctx.get('inertia')('Home', { title: 'Welcome' });
 *
 * // Sharing global data
 * ctx.get('inertia').share('app_name', 'My Project');
 * ```
 */
export interface InertiaHelper {
  /**
   * Renders an Inertia component.
   *
   * This is a shortcut for calling `render()` on the underlying service.
   *
   * @param component - Frontend component name (e.g., 'Pages/Dashboard')
   * @param props - Data object passed to the component
   * @param rootVars - Variables passed to the root HTML template
   * @param status - Optional HTTP status code (defaults to 200)
   * @returns Gravito-compatible HTTP Response
   * @throws {InertiaError} If serialization or root rendering fails
   */
  <T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Response

  /**
   * Shares a single piece of data with all subsequent Inertia responses.
   *
   * @param key - Unique identifier for the shared prop
   * @param value - Data value (must be JSON serializable)
   */
  share(key: string, value: unknown): void

  /**
   * Shares multiple props simultaneously.
   *
   * @param props - Key-value pairs to merge into shared props
   */
  shareAll(props: Record<string, unknown>): void

  /**
   * Retrieves a copy of all currently shared props.
   *
   * @returns Current shared props dictionary
   */
  getSharedProps(): Record<string, unknown>

  /**
   * Explicitly renders an Inertia component.
   *
   * @param component - Frontend component name
   * @param props - Component data
   * @param rootVars - Template variables
   * @param status - HTTP status code
   * @returns HTTP Response
   * @throws {InertiaError} If rendering lifecycle fails
   */
  render<T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Response

  /**
   * Direct access to the low-level InertiaService instance.
   */
  service: InertiaService
}

/**
 * Configuration options for the OrbitIon extension.
 */
export interface OrbitIonOptions {
  /**
   * Asset version string used for cache busting and X-Inertia-Version checks.
   * @default '1.0.0' (or core config value)
   */
  version?: string

  /**
   * The name of the root HTML template file (without extension).
   * @default 'app'
   */
  rootView?: string
}

/**
 * OrbitIon provides official Inertia.js integration for Gravito.
 *
 * It acts as an infrastructure extension (Orbit) that manages the Inertia protocol,
 * handles partial reloads, ensures asset synchronization, and injects the
 * `InertiaHelper` into the request context.
 *
 * @example
 * ```typescript
 * import { OrbitIon } from '@gravito/ion';
 *
 * core.addOrbit(new OrbitIon({
 *   version: 'v2',
 *   rootView: 'main'
 * }));
 * ```
 */
export class OrbitIon implements GravitoOrbit {
  /**
   * Initializes the Orbit with custom configuration.
   *
   * @param options - Configuration overrides
   */
  constructor(private options: OrbitIonOptions = {}) {}

  /**
   * Registers the Inertia middleware and service factory into PlanetCore.
   *
   * @param core - The micro-kernel instance
   */
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed (Callable Interface)')

    const appVersion = this.options.version ?? core.config.get('APP_VERSION', '1.0.0')
    const rootView = this.options.rootView ?? 'app'

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      const service = new InertiaService(c, {
        version: String(appVersion),
        rootView,
      })

      const inertiaProxy = (
        component: string,
        props: Record<string, unknown> = {},
        rootVars: Record<string, unknown> = {},
        status?: number
      ) => {
        return service.render(component, props, rootVars, status)
      }

      Object.assign(inertiaProxy, {
        share: service.share.bind(service),
        shareAll: service.shareAll.bind(service),
        getSharedProps: service.getSharedProps.bind(service),
        render: service.render.bind(service),
        service,
      })

      c.set('inertia', inertiaProxy as InertiaHelper)
      return await next()
    })
  }
}

export default OrbitIon
