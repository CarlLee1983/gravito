import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { type FortifyConfig, defaultFortifyConfig } from './config'
import { registerAuthRoutes } from './routes/auth'

/**
 * FortifyOrbit - Gravito Orbit for end-to-end authentication workflows
 * 
 * @example
 * ```typescript
 * import { FortifyOrbit } from '@gravito/fortify'
 * 
 * const core = await PlanetCore.boot({
 *   orbits: [new FortifyOrbit({
 *     userModel: () => User,
 *     features: { emailVerification: true }
 *   })]
 * })
 * ```
 */
export class FortifyOrbit implements GravitoOrbit {
    private config: FortifyConfig

    constructor(config: FortifyConfig) {
        this.config = {
            ...defaultFortifyConfig,
            ...config,
            features: {
                ...defaultFortifyConfig.features,
                ...config.features,
            },
            redirects: {
                ...defaultFortifyConfig.redirects,
                ...config.redirects,
            },
        } as FortifyConfig
    }

    async install(core: PlanetCore): Promise<void> {
        // Store config in container for controllers to access
        core.container.singleton('fortify.config', () => this.config)

        // Register authentication routes
        registerAuthRoutes(core.router, this.config)

        core.logger.info('[Fortify] Authentication routes registered')
    }
}
