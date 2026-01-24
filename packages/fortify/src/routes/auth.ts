import type { Router } from '@gravito/core'
import { csrfProtection } from '@gravito/core'
import type { Knex } from 'knex'
import type { FortifyConfig } from '../config'
import { ForgotPasswordController } from '../controllers/ForgotPasswordController'
import { LoginController } from '../controllers/LoginController'
import { LogoutController } from '../controllers/LogoutController'
import { MagicLinkController } from '../controllers/MagicLinkController'
import { OAuthController } from '../controllers/OAuthController'
import { RegisterController } from '../controllers/RegisterController'
import { ResetPasswordController } from '../controllers/ResetPasswordController'
import { TokenController } from '../controllers/TokenController'
import { TwoFactorController } from '../controllers/TwoFactorController'
import { VerifyEmailController } from '../controllers/VerifyEmailController'
import { resolveCsrfOptions } from '../csrf'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import { bearerTokenAuth } from '../middleware/BearerTokenAuth'
import { securityHeaders } from '../middleware/SecurityHeaders'
import type { AuthLogger } from '../services/AuthLogger'
import type { MagicLinkService } from '../services/MagicLinkService'
import type { OAuthService } from '../services/OAuthService'
import type { PersonalAccessTokenService } from '../services/PersonalAccessTokenService'
import type { RateLimiter } from '../services/RateLimiter'
import type { StrengthValidator } from '../services/StrengthValidator'
import type { TwoFactorService } from '../services/TwoFactorService'

/**
 * Register all authentication routes
 *
 * @example
 * ```typescript
 * import { registerAuthRoutes } from '@gravito/fortify'
 *
 * registerAuthRoutes(router, {
 *   userModel: () => User,
 *   prefix: '/auth'
 * })
 * ```
 */
export function registerAuthRoutes(
  router: Router,
  config: FortifyConfig,
  loginRateLimiter?: RateLimiter,
  passwordResetRateLimiter?: RateLimiter,
  emailVerificationRateLimiter?: RateLimiter,
  strengthValidator?: StrengthValidator,
  authLogger?: AuthLogger,
  tokenService?: PersonalAccessTokenService,
  oauthService?: OAuthService,
  db?: () => Knex,
  events?: FortifyEventEmitter,
  twoFactorService?: TwoFactorService,
  magicLinkService?: MagicLinkService
): void {
  const prefix = config.prefix ?? ''
  const csrfOptions = resolveCsrfOptions(config)
  const csrfMiddleware = csrfOptions ? csrfProtection(csrfOptions) : null

  const securityConfig = config.security?.securityHeaders
  const middlewareStack = []

  if (securityConfig) {
    middlewareStack.push(securityHeaders(securityConfig))
  }

  if (csrfMiddleware) {
    middlewareStack.push(csrfMiddleware)
  }

  const secured =
    middlewareStack.length > 0 && typeof router.middleware === 'function'
      ? router.middleware(...middlewareStack)
      : router

  const login = new LoginController(config, loginRateLimiter, authLogger)
  const register = new RegisterController(config, strengthValidator, authLogger)
  const logout = new LogoutController(config, authLogger)
  const forgotPassword = new ForgotPasswordController(config, passwordResetRateLimiter)
  const resetPassword = new ResetPasswordController(config, strengthValidator)
  const verifyEmail = new VerifyEmailController(config, emailVerificationRateLimiter, authLogger)

  secured.get(`${prefix}/login`, (c) => login.show(c))
  secured.post(`${prefix}/login`, (c) => login.store(c))

  secured.post(`${prefix}/logout`, (c) => logout.destroy(c))

  if (config.features.registration !== false) {
    secured.get(`${prefix}/register`, (c) => register.show(c))
    secured.post(`${prefix}/register`, (c) => register.store(c))
  }

  if (config.features.resetPasswords !== false) {
    secured.get(`${prefix}/forgot-password`, (c) => forgotPassword.show(c))
    secured.post(`${prefix}/forgot-password`, (c) => forgotPassword.store(c))
    secured.get(`${prefix}/reset-password/:token`, (c) => resetPassword.show(c))
    secured.post(`${prefix}/reset-password`, (c) => resetPassword.store(c))
  }

  if (config.features.emailVerification) {
    secured.get(`${prefix}/verify-email`, (c) => verifyEmail.show(c))
    secured.get(`${prefix}/verify-email/:id/:hash`, (c) => verifyEmail.verify(c))
    secured.post(`${prefix}/email/verification-notification`, (c) => verifyEmail.send(c))
  }

  if (config.features.apiTokens && tokenService) {
    const tokenController = new TokenController(config, tokenService, events)
    const tokenAuth = bearerTokenAuth(tokenService)

    router.get(`${prefix}/tokens`, tokenAuth, (c) => tokenController.index(c))
    router.post(`${prefix}/tokens`, tokenAuth, (c) => tokenController.store(c))
    router.delete(`${prefix}/tokens/:id`, tokenAuth, (c) => tokenController.destroy(c))
    router.delete(`${prefix}/tokens`, tokenAuth, (c) => tokenController.destroyAll(c))
  }

  if (config.features.oauth && oauthService && db) {
    const oauthController = new OAuthController(config, oauthService, db, events)
    router.get(`${prefix}/oauth/:provider`, (c) => oauthController.redirect(c))
    router.get(`${prefix}/oauth/:provider/callback`, (c) => oauthController.callback(c))
  }

  if (config.features.twoFactorAuthentication && twoFactorService && db) {
    const twoFactorController = new TwoFactorController(config, twoFactorService, db, events)
    router.get(`${prefix}/two-factor/setup`, (c) => twoFactorController.setup(c))
    router.post(`${prefix}/two-factor/confirm`, (c) => twoFactorController.confirm(c))
    router.delete(`${prefix}/two-factor`, (c) => twoFactorController.disable(c))
    router.get(`${prefix}/two-factor/challenge`, (c) => twoFactorController.showChallenge(c))
    router.post(`${prefix}/two-factor/challenge`, (c) => twoFactorController.challenge(c))
  }

  if (config.features.magicLink && magicLinkService) {
    const magicLinkController = new MagicLinkController(config, magicLinkService, events)
    router.get(`${prefix}/magic-link`, (c) => c.json({ view: 'magic-link' }))
    router.post(`${prefix}/magic-link`, (c) => magicLinkController.send(c))
    router.get(`${prefix}/magic-link/:token`, (c) => magicLinkController.verify(c))
  }
}
