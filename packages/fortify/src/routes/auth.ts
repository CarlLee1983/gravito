import type { Router } from '@gravito/core'
import { csrfProtection } from '@gravito/core'
import type { FortifyConfig } from '../config'
import { ForgotPasswordController } from '../controllers/ForgotPasswordController'
import { LoginController } from '../controllers/LoginController'
import { LogoutController } from '../controllers/LogoutController'
import { RegisterController } from '../controllers/RegisterController'
import { ResetPasswordController } from '../controllers/ResetPasswordController'
import { VerifyEmailController } from '../controllers/VerifyEmailController'
import { resolveCsrfOptions } from '../csrf'

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
export function registerAuthRoutes(router: Router, config: FortifyConfig): void {
  const prefix = config.prefix ?? ''
  const csrfOptions = resolveCsrfOptions(config)
  const csrfMiddleware = csrfOptions ? csrfProtection(csrfOptions) : null
  const secured =
    csrfMiddleware && typeof (router as { middleware?: unknown }).middleware === 'function'
      ? router.middleware(csrfMiddleware)
      : router

  // Initialize controllers
  const login = new LoginController(config)
  const register = new RegisterController(config)
  const logout = new LogoutController(config)
  const forgotPassword = new ForgotPasswordController(config)
  const resetPassword = new ResetPasswordController(config)
  const verifyEmail = new VerifyEmailController(config)

  // ─────────────────────────────────────────────────────────────────────────
  // Login Routes
  // ─────────────────────────────────────────────────────────────────────────
  secured.get(`${prefix}/login`, (c) => login.show(c))
  secured.post(`${prefix}/login`, (c) => login.store(c))

  // ─────────────────────────────────────────────────────────────────────────
  // Logout Route
  // ─────────────────────────────────────────────────────────────────────────
  secured.post(`${prefix}/logout`, (c) => logout.destroy(c))

  // ─────────────────────────────────────────────────────────────────────────
  // Registration Routes (if enabled)
  // ─────────────────────────────────────────────────────────────────────────
  if (config.features.registration !== false) {
    secured.get(`${prefix}/register`, (c) => register.show(c))
    secured.post(`${prefix}/register`, (c) => register.store(c))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Reset Routes (if enabled)
  // ─────────────────────────────────────────────────────────────────────────
  if (config.features.resetPasswords !== false) {
    secured.get(`${prefix}/forgot-password`, (c) => forgotPassword.show(c))
    secured.post(`${prefix}/forgot-password`, (c) => forgotPassword.store(c))
    secured.get(`${prefix}/reset-password/:token`, (c) => resetPassword.show(c))
    secured.post(`${prefix}/reset-password`, (c) => resetPassword.store(c))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Email Verification Routes (if enabled)
  // ─────────────────────────────────────────────────────────────────────────
  if (config.features.emailVerification) {
    secured.get(`${prefix}/verify-email`, (c) => verifyEmail.show(c))
    secured.get(`${prefix}/verify-email/:id/:hash`, (c) => verifyEmail.verify(c))
    secured.post(`${prefix}/email/verification-notification`, (c) => verifyEmail.send(c))
  }
}
