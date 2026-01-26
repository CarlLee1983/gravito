import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { defaultFortifyConfig, type FortifyConfig } from './config'
import { FortifyEventEmitter } from './events/EventEmitter'
import { securityHeaders } from './middleware/SecurityHeaders'
import { registerAuthRoutes } from './routes/auth'
import { MemoryAuthLogger } from './services/AuthLogger'
import { MagicLinkService } from './services/MagicLinkService'
import { GitHubProvider } from './services/OAuth/GitHubProvider'
import { GoogleProvider } from './services/OAuth/GoogleProvider'
import { OAuthService } from './services/OAuthService'
import { PersonalAccessTokenService } from './services/PersonalAccessTokenService'
import { MemoryRateLimiterStorage, RateLimiter } from './services/RateLimiter'
import { StrengthValidator } from './services/StrengthValidator'
import { TwoFactorService } from './services/TwoFactorService'

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
      security: {
        ...defaultFortifyConfig.security,
        ...config.security,
        rateLimit: {
          ...defaultFortifyConfig.security?.rateLimit,
          ...config.security?.rateLimit,
        },
        lockout: {
          ...defaultFortifyConfig.security?.lockout,
          ...config.security?.lockout,
        },
        passwordRules: {
          ...defaultFortifyConfig.security?.passwordRules,
          ...config.security?.passwordRules,
        },
        securityHeaders: {
          ...defaultFortifyConfig.security?.securityHeaders,
          ...config.security?.securityHeaders,
        },
        logging: {
          ...defaultFortifyConfig.security?.logging,
          ...config.security?.logging,
        },
        session: {
          ...defaultFortifyConfig.security?.session,
          ...config.security?.session,
        },
      },
    } as FortifyConfig
  }

  async install(core: PlanetCore): Promise<void> {
    core.container.singleton('fortify.config', () => this.config)

    const rateLimiterStorage = new MemoryRateLimiterStorage()
    const loginRateLimiter = new RateLimiter(
      rateLimiterStorage,
      this.config.security?.rateLimit?.login ?? defaultFortifyConfig.security!.rateLimit!.login!
    )
    const passwordResetRateLimiter = new RateLimiter(
      rateLimiterStorage,
      this.config.security?.rateLimit?.passwordReset ??
        defaultFortifyConfig.security!.rateLimit!.passwordReset!
    )
    const emailVerificationRateLimiter = new RateLimiter(
      rateLimiterStorage,
      this.config.security?.rateLimit?.emailVerification ??
        defaultFortifyConfig.security!.rateLimit!.emailVerification!
    )

    core.container.singleton('fortify.rateLimiter.login', () => loginRateLimiter)
    core.container.singleton('fortify.rateLimiter.passwordReset', () => passwordResetRateLimiter)
    core.container.singleton(
      'fortify.rateLimiter.emailVerification',
      () => emailVerificationRateLimiter
    )

    const strengthValidator = new StrengthValidator(
      this.config.security?.passwordRules ?? defaultFortifyConfig.security!.passwordRules!
    )
    core.container.singleton('fortify.strengthValidator', () => strengthValidator)

    const authLogger = new MemoryAuthLogger()
    core.container.singleton('fortify.authLogger', () => authLogger)

    const events = new FortifyEventEmitter()
    core.container.singleton('fortify.events', () => events)

    let tokenService: PersonalAccessTokenService | undefined
    if (this.config.features.apiTokens) {
      tokenService = new PersonalAccessTokenService(() => core.container.make('db'))
      core.container.singleton('fortify.tokenService', () => tokenService!)
    }

    let oauthService: OAuthService | undefined
    if (this.config.features.oauth && this.config.oauth) {
      oauthService = new OAuthService()
      for (const [name, providerConfig] of Object.entries(this.config.oauth.providers)) {
        if (name === 'google') {
          oauthService.register(name, new GoogleProvider(providerConfig))
        } else if (name === 'github') {
          oauthService.register(name, new GitHubProvider(providerConfig))
        }
      }
      core.container.singleton('fortify.oauthService', () => oauthService!)
    }

    let twoFactorService: TwoFactorService | undefined
    if (this.config.features.twoFactorAuthentication) {
      twoFactorService = new TwoFactorService(this.config.twoFactor ?? { enabled: true })
      core.container.singleton('fortify.twoFactorService', () => twoFactorService!)
    }

    let magicLinkService: MagicLinkService | undefined
    if (this.config.features.magicLink) {
      if (!tokenService) {
        tokenService = new PersonalAccessTokenService(() => core.container.make('db'))
      }
      magicLinkService = new MagicLinkService(this.config, tokenService)
      core.container.singleton('fortify.magicLinkService', () => magicLinkService!)
    }

    registerAuthRoutes(
      core.router,
      this.config,
      loginRateLimiter,
      passwordResetRateLimiter,
      emailVerificationRateLimiter,
      strengthValidator,
      authLogger,
      tokenService,
      oauthService,
      () => core.container.make('db'),
      events,
      twoFactorService,
      magicLinkService
    )

    core.logger.info('[Fortify] Authentication routes registered')
  }
}
