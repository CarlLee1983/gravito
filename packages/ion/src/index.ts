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
    /** Inertia.js service for SPA rendering */
    inertia?: InertiaService
  }
}

/**
 * OrbitIon - Inertia.js integration orbit
 *
 * This orbit provides seamless Inertia.js integration, enabling
 * SPA-like navigation with server-side routing.
 *
 * @example
 * ```typescript
 * import { PlanetCore, defineConfig } from '@gravito/core'
 * import { OrbitIon } from '@gravito/ion'
 *
 * const core = await PlanetCore.boot(defineConfig({
 *   orbits: [OrbitIon]
 * }))
 * ```
 */
export interface OrbitIonOptions {
  version?: string
  rootView?: string
}

export class OrbitIon implements GravitoOrbit {
  constructor(private options: OrbitIonOptions = {}) {}

  /**
   * Install the Inertia orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed')

    const appVersion = this.options.version ?? core.config.get('APP_VERSION', '1.0.0')
    const rootView = this.options.rootView ?? 'app'

    // Register middleware to inject Inertia helper
    core.adapter.use('*', async (c: any, next: any) => {
      // The adapter passes a GravitoContext to middleware
      const gravitoCtx = c as GravitoContext<GravitoVariables>

      // Initialize with config
      const inertia = new InertiaService(gravitoCtx, {
        version: String(appVersion),
        rootView,
      })

      c.set('inertia', inertia)
      await next()
      return undefined
    })
  }
}

/**
 * Default export for convenience
 */
export default OrbitIon
