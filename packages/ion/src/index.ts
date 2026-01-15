/**
 * @fileoverview Orbit Inertia - Inertia.js integration for Gravito
 *
 * Provides server-side Inertia.js integration for building modern
 * single-page applications with server-side routing.
 *
 * @module @gravito/ion
 * @since 1.0.0
 */

import type { GravitoContext, GravitoOrbit, GravitoVariables, PlanetCore } from '@gravito/core'
import { InertiaService } from './InertiaService'

export * from './InertiaService'

// Module augmentation for type-safe context injection
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Inertia.js service helper */
    inertia: (
      component: string,
      props?: Record<string, unknown>,
      rootVars?: Record<string, unknown>
    ) => Response
  }
}

/**
 * OrbitIon - Inertia.js integration orbit
 */
export interface OrbitIonOptions {
  version?: string
  rootView?: string
}

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
    core.adapter.use('*', async (c: any, next: any) => {
      const gravitoCtx = c as GravitoContext<GravitoVariables>

      const service = new InertiaService(gravitoCtx, {
        version: String(appVersion),
        rootView,
      })

      // Create a callable function that delegates to service.render
      const inertiaProxy = (
        component: string,
        props: Record<string, unknown> = {},
        rootVars: Record<string, unknown> = {}
      ) => {
        return service.render(component, props, rootVars)
      }

      // Attach methods to the function to allow advanced usage (share, etc.)
      Object.assign(inertiaProxy, {
        share: service.share.bind(service),
        shareAll: service.shareAll.bind(service),
        getSharedProps: service.getSharedProps.bind(service),
        render: service.render.bind(service), // Also allow .render()
        service, // Access to the raw service instance
      })

      c.set('inertia', inertiaProxy as any)
      return await next()
    })
  }
}

/**
 * Default export for convenience
 */
export default OrbitIon
