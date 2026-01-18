import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { defaultFortifyConfig, type FortifyConfig } from './config'
import { registerAuthRoutes } from './routes/auth'

/**
 * FortifyOrbit provides end-to-end authentication workflows for Gravito.
 * It registers dedicated controllers and routes for high-level auth features
 * such as registration, multi-factor login, and password management.
 *
 * @example
 * ```typescript
 * import { FortifyOrbit } from '@gravito/fortify';
 * import { User } from './models/User';
 *
 * const fortify = new FortifyOrbit({
 *   userModel: () => User,
 *   features: { registration: true, emailVerification: false }
 * });
 * core.addOrbit(fortify);
 * ```
 * @public
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
