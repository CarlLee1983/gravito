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

// Core Orbit
export { FortifyOrbit } from './FortifyOrbit'

// Configuration
export { type FortifyConfig, definefortifyConfig, defaultFortifyConfig } from './config'

// Controllers
export { LoginController } from './controllers/LoginController'
export { RegisterController } from './controllers/RegisterController'
export { LogoutController } from './controllers/LogoutController'
export { ForgotPasswordController } from './controllers/ForgotPasswordController'
export { ResetPasswordController } from './controllers/ResetPasswordController'
export { VerifyEmailController } from './controllers/VerifyEmailController'

// Routes
export { registerAuthRoutes } from './routes/auth'

// Middleware
export { verified } from './middleware/verified'
