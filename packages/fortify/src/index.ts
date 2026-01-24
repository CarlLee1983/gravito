/**
 * @gravito/fortify
 *
 * End-to-End Authentication Workflows for Gravito Framework.
 * Provides ready-to-use controllers, routes, and views for:
 * - User Registration
 * - Login / Logout
 * - Password Reset
 * - Email Verification
 *
 * @packageDocumentation
 */

// Configuration
export { defaultFortifyConfig, definefortifyConfig, type FortifyConfig } from './config'
// Controllers
export { BaseController } from './controllers/BaseController'
export { ForgotPasswordController } from './controllers/ForgotPasswordController'
export { LoginController } from './controllers/LoginController'
export { LogoutController } from './controllers/LogoutController'
export { OAuthController } from './controllers/OAuthController'
export { RegisterController } from './controllers/RegisterController'
export { ResetPasswordController } from './controllers/ResetPasswordController'
export { TokenController } from './controllers/TokenController'
export { VerifyEmailController } from './controllers/VerifyEmailController'
// Errors
export { ErrorCodes } from './errors/codes'
export { FortifyError } from './errors/FortifyError'
// Events
export { FortifyEventEmitter } from './events/EventEmitter'
export type { FortifyEvents } from './events/types'
// Core Orbit
export { FortifyOrbit } from './FortifyOrbit'
// Middleware
export { bearerTokenAuth, getAuthToken, getAuthUser, tokenCan } from './middleware/BearerTokenAuth'
export { verified } from './middleware/verified'
// Routes
export { registerAuthRoutes } from './routes/auth'
export { GitHubProvider } from './services/OAuth/GitHubProvider'
export { GoogleProvider } from './services/OAuth/GoogleProvider'
export * from './services/OAuth/types'
export { OAuthService } from './services/OAuthService'
// Services
export { PersonalAccessTokenService } from './services/PersonalAccessTokenService'
