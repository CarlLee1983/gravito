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
export * from './types'

/**
 * Enhanced helper interface for Inertia operations within the Gravito context.
 *
 * This interface is both a callable function for quick rendering and a
 * service container for managing shared data and accessing the underlying service.
 * It is typically accessed via `ctx.get('inertia')`.
 *
 * @example
 * ```typescript
 * // 1. Direct rendering (Callable)
 * export const index = async (ctx: Context) => {
 *   return await ctx.get('inertia')('Home', { title: 'Welcome' });
 * };
 *
 * // 2. Sharing global data
 * ctx.get('inertia').share('app_name', 'My Project');
 *
 * // 3. Accessing the underlying service
 * const service = ctx.get('inertia').service;
 * ```
 */
export interface InertiaHelper {
  /**
   * Renders an Inertia component.
   *
   * This is a shortcut for calling `render()` on the underlying service.
   *
   * @param component - Frontend component name (e.g., 'Pages/Dashboard').
   * @param props - Data object passed to the component. Supports lazy/async props.
   * @param rootVars - Variables passed to the root HTML template (initial load only).
   * @param status - Optional HTTP status code (defaults to 200).
   * @returns A promise resolving to a Gravito-compatible HTTP Response.
   *
   * @throws {@link InertiaError}
   * Thrown if serialization fails or the ViewService is missing during initial load.
   */
  <T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Promise<Response>

  /**
   * Shares a single piece of data with all subsequent Inertia responses for this request.
   *
   * @param key - Unique identifier for the shared prop.
   * @param value - Data value. Must be JSON serializable.
   */
  share(key: string, value: unknown): void

  /**
   * Shares multiple props simultaneously by merging them into the shared state.
   *
   * @param props - Key-value pairs to merge into shared props.
   */
  shareAll(props: Record<string, unknown>): void

  /**
   * Retrieves a copy of all currently shared props for the current request.
   *
   * @returns Current shared props dictionary.
   */
  getSharedProps(): Record<string, unknown>

  /**
   * Explicitly renders an Inertia component.
   *
   * Identical to the callable interface but provided for semantic clarity.
   *
   * @param component - Frontend component name.
   * @param props - Component data.
   * @param rootVars - Template variables.
   * @param status - HTTP status code.
   * @returns A promise resolving to an HTTP Response.
   *
   * @throws {@link InertiaError}
   * Thrown if the rendering lifecycle encounters a fatal error.
   */
  render<T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars?: Record<string, unknown>,
    status?: number
  ): Promise<Response>

  /**
   * Instructs the client to navigate to a different URL.
   *
   * @param url - The URL to navigate to.
   * @returns A redirect response.
   */
  location(url: string): Response

  /**
   * Encrypts the browser history to prevent navigation via back button.
   *
   * @param encrypt - Whether to enable history encryption (defaults to true).
   * @returns The helper for method chaining.
   */
  encryptHistory(encrypt?: boolean): InertiaHelper

  /**
   * Clears the browser history after page load.
   *
   * @returns The helper for method chaining.
   */
  clearHistory(): InertiaHelper

  /**
   * Registers form validation errors organized by bag name.
   *
   * @param errors - Error map with field names as keys.
   * @param bag - The error bag name (defaults to 'default').
   * @returns The helper for method chaining.
   */
  withErrors(errors: Record<string, string | string[]>, bag?: string): InertiaHelper

  /**
   * Direct access to the low-level `InertiaService` instance.
   *
   * Use this for advanced operations not exposed by the helper interface.
   */
  service: InertiaService
}

/**
 * Configuration options for the OrbitIon extension.
 *
 * Controls how the Inertia protocol is integrated into the Gravito ecosystem.
 */
export interface OrbitIonOptions {
  /**
   * Asset version string or resolver used for cache busting.
   *
   * If not provided, it defaults to the `APP_VERSION` defined in the core configuration.
   *
   * @defaultValue '1.0.0'
   */
  version?: string | (() => string | Promise<string>)

  /**
   * The name of the root HTML template file (without extension).
   *
   * This template is used for the initial page load.
   *
   * @defaultValue 'app'
   */
  rootView?: string

  /**
   * SSR configuration options.
   *
   * Enables server-side pre-rendering of components.
   */
  ssr?: {
    /** Whether SSR is enabled for this application. */
    enabled: boolean
    /**
     * Function to handle SSR rendering.
     *
     * Receives the Inertia page object and should return the rendered HTML.
     */
    render?: (page: any) => Promise<{ head: string[]; body: string }>
  }

  /**
   * CSRF protection configuration.
   *
   * Automatically sets the XSRF-TOKEN cookie for CSRF protection.
   *
   * @defaultValue { enabled: true, cookieName: 'XSRF-TOKEN' }
   */
  csrf?: {
    /** Whether CSRF protection is enabled. */
    enabled?: boolean
    /** Name of the CSRF token cookie (commonly read by Axios). */
    cookieName?: string
  }
}

/**
 * OrbitIon provides official Inertia.js integration for Gravito.
 *
 * As an infrastructure extension (Orbit), it:
 * 1. Registers a global middleware to handle the Inertia protocol.
 * 2. Manages asset version synchronization (X-Inertia-Version).
 * 3. Injects the `InertiaHelper` into the request context for easy access in controllers.
 * 4. Supports partial reloads and SSR out of the box.
 *
 * @example
 * ```typescript
 * import { OrbitIon } from '@gravito/ion';
 *
 * // In your application bootstrap
 * core.addOrbit(new OrbitIon({
 *   version: 'v2.1.0',
 *   rootView: 'layouts/app',
 *   ssr: {
 *     enabled: process.env.SSR === 'true',
 *     render: async (page) => await mySsrRenderer(page)
 *   }
 * }));
 * ```
 */
export class OrbitIon implements GravitoOrbit {
  /**
   * Initializes the Orbit with custom configuration.
   *
   * @param options - Configuration overrides for the Inertia service.
   */
  constructor(private options: OrbitIonOptions = {}) {}

  /**
   * Registers the Inertia middleware and service factory into PlanetCore.
   *
   * This method is called automatically by Gravito during the boot process.
   * It sets up the `InertiaService` for each request and attaches
   * the `InertiaHelper` proxy to the context.
   *
   * @param core - The Gravito micro-kernel instance.
   *
   * @example
   * ```typescript
   * const ion = new OrbitIon({ version: '1.0' });
   * ion.install(core);
   * ```
   */
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed (Callable Interface)')

    const appVersion = this.options.version ?? core.config.get('APP_VERSION', '1.0.0')
    const rootView = this.options.rootView ?? 'app'
    const csrfEnabled = this.options.csrf?.enabled !== false
    const csrfCookieName = this.options.csrf?.cookieName ?? 'XSRF-TOKEN'

    // CSRF token middleware
    if (csrfEnabled) {
      core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
        const token = crypto.randomUUID()
        const secure = process.env.NODE_ENV === 'production'
        const cookieValue = `${csrfCookieName}=${token}; Path=/; ${secure ? 'Secure; ' : ''}SameSite=Lax`
        c.header('Set-Cookie', cookieValue)
        return await next()
      })
    }

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      const service = new InertiaService(c, {
        version: appVersion as any,
        rootView,
        ssr: this.options.ssr,
      })

      const inertiaProxy = async (
        component: string,
        props: Record<string, unknown> = {},
        rootVars: Record<string, unknown> = {},
        status?: number
      ) => {
        return await service.render(component, props, rootVars, status)
      }

      Object.assign(inertiaProxy, {
        share: service.share.bind(service),
        shareAll: service.shareAll.bind(service),
        getSharedProps: service.getSharedProps.bind(service),
        render: service.render.bind(service),
        location: service.location.bind(service),
        encryptHistory: service.encryptHistory.bind(service),
        clearHistory: service.clearHistory.bind(service),
        withErrors: service.withErrors.bind(service),
        service,
      })

      c.set('inertia', inertiaProxy as InertiaHelper)
      return await next()
    })
  }
}

export default OrbitIon
