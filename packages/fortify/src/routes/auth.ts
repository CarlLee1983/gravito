import type { Router } from 'gravito-core'
import type { FortifyConfig } from '../config'
import { LoginController } from '../controllers/LoginController'
import { RegisterController } from '../controllers/RegisterController'
import { LogoutController } from '../controllers/LogoutController'
import { ForgotPasswordController } from '../controllers/ForgotPasswordController'
import { ResetPasswordController } from '../controllers/ResetPasswordController'
import { VerifyEmailController } from '../controllers/VerifyEmailController'

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
    router.get(`${prefix}/login`, (c) => login.show(c))
    router.post(`${prefix}/login`, (c) => login.store(c))

    // ─────────────────────────────────────────────────────────────────────────
    // Logout Route
    // ─────────────────────────────────────────────────────────────────────────
    router.post(`${prefix}/logout`, (c) => logout.destroy(c))

    // ─────────────────────────────────────────────────────────────────────────
    // Registration Routes (if enabled)
    // ─────────────────────────────────────────────────────────────────────────
    if (config.features.registration !== false) {
        router.get(`${prefix}/register`, (c) => register.show(c))
        router.post(`${prefix}/register`, (c) => register.store(c))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Password Reset Routes (if enabled)
    // ─────────────────────────────────────────────────────────────────────────
    if (config.features.resetPasswords !== false) {
        router.get(`${prefix}/forgot-password`, (c) => forgotPassword.show(c))
        router.post(`${prefix}/forgot-password`, (c) => forgotPassword.store(c))
        router.get(`${prefix}/reset-password/:token`, (c) => resetPassword.show(c))
        router.post(`${prefix}/reset-password`, (c) => resetPassword.store(c))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email Verification Routes (if enabled)
    // ─────────────────────────────────────────────────────────────────────────
    if (config.features.emailVerification) {
        router.get(`${prefix}/verify-email`, (c) => verifyEmail.show(c))
        router.get(`${prefix}/verify-email/:id/:hash`, (c) => verifyEmail.verify(c))
        router.post(`${prefix}/email/verification-notification`, (c) => verifyEmail.send(c))
    }
}
