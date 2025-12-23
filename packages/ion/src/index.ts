/**
 * @fileoverview Orbit Inertia - Inertia.js integration for Gravito
 *
 * Provides server-side Inertia.js integration for building modern
 * single-page applications with server-side routing.
 *
 * @module @gravito/ion
 * @since 1.0.0
 */

import type { GravitoContext, GravitoOrbit, GravitoVariables, PlanetCore } from 'gravito-core'
import { HonoContextWrapper } from 'gravito-core'
import { InertiaService } from './InertiaService'

export * from './InertiaService'

// Module augmentation for type-safe context injection
declare module 'gravito-core' {
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
 * import { PlanetCore, defineConfig } from 'gravito-core'
 * import { OrbitIon } from '@gravito/ion'
 *
 * const core = await PlanetCore.boot(defineConfig({
 *   orbits: [OrbitIon]
 * }))
 * ```
 */
export class OrbitIon implements GravitoOrbit {
  /**
   * Install the Inertia orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed')

    const appVersion = core.config.get('APP_VERSION', '1.0.0')

    // Register middleware to inject Inertia helper
    core.adapter.use('*', async (c: any, next: any) => {
      // Create GravitoContext wrapper for InertiaService
      // This allows InertiaService to use the abstraction layer
      const gravitoCtx = new HonoContextWrapper(c) as GravitoContext<GravitoVariables>

      // Initialize with config
      const inertia = new InertiaService(gravitoCtx, {
        version: String(appVersion),
        rootView: 'app', // Default to src/views/app.html
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
