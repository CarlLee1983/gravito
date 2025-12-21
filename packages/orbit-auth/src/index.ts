/**
 * @fileoverview Orbit Auth - Authentication & Authorization for Gravito
 *
 * Provides comprehensive authentication with multiple guards, password
 * reset, email verification, and authorization gates.
 *
 * @module @gravito/orbit-auth
 * @since 1.0.0
 */

import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { Context, Next } from 'hono'
import { type AuthConfig, AuthManager, type UserProviderResolver } from './AuthManager'
import { type EmailVerificationOptions, EmailVerificationService } from './EmailVerification'
import { Gate } from './Gate'
import { type HashConfig, HashManager } from './HashManager'
import {
  InMemoryPasswordResetTokenRepository,
  PasswordBroker,
  type PasswordBrokerOptions,
  type PasswordResetTokenRepository,
} from './PasswordBroker'

export * from './AuthManager'
export * from './contracts/Authenticatable'
export * from './contracts/Guard'
export * from './contracts/UserProvider'
export * from './EmailVerification'
export * from './Gate'
export * from './guards/JwtGuard'
export * from './guards/SessionGuard'
export * from './guards/TokenGuard'
export * from './HashManager'
export * from './middleware/auth'
export * from './middleware/can'
export * from './middleware/guest'
export * from './PasswordBroker'
export * from './providers/CallbackUserProvider'

export interface OrbitAuthOptions extends AuthConfig {
  exposeAs?: string
  exposeGateAs?: string
  exposeHashAs?: string
  exposePasswordBrokerAs?: string
  exposeEmailVerificationAs?: string

  hash?: HashConfig
  passwordReset?: {
    enabled?: boolean
    repository?: PasswordResetTokenRepository
  } & PasswordBrokerOptions
  emailVerification?: { enabled?: boolean; secret?: string } & EmailVerificationOptions

  bindings?: {
    providers?: Record<string, UserProviderResolver>
  }
}

export class OrbitAuth implements GravitoOrbit {
  public readonly gate: Gate

  constructor(private options: OrbitAuthOptions) {
    this.gate = new Gate()
  }

  install(core: PlanetCore): void {
    const {
      exposeAs = 'auth',
      exposeGateAs = 'gate',
      exposeHashAs = 'hash',
      exposePasswordBrokerAs = 'passwords',
      exposeEmailVerificationAs = 'emailVerification',
      bindings,
    } = this.options
    const logger = core.logger

    logger.info(`[OrbitAuth] Initializing Auth (Exposed as: ${exposeAs})`)

    const hash = new HashManager(this.options.hash)
    core.container.instance(exposeHashAs, hash)
    core.services.set(exposeHashAs, hash)

    const passwordResetEnabled = this.options.passwordReset?.enabled ?? false
    const passwordBroker = passwordResetEnabled
      ? new PasswordBroker(
          this.options.passwordReset?.repository ?? new InMemoryPasswordResetTokenRepository(),
          hash,
          this.options.passwordReset
        )
      : null

    if (passwordBroker) {
      core.container.instance(exposePasswordBrokerAs, passwordBroker)
      core.services.set(exposePasswordBrokerAs, passwordBroker)
    }

    const emailVerificationEnabled = this.options.emailVerification?.enabled ?? false
    const appKeyFromCore =
      (core.config.has('APP_KEY') ? core.config.get<string>('APP_KEY') : undefined) ||
      process.env.APP_KEY
    const emailVerificationSecret = this.options.emailVerification?.secret ?? appKeyFromCore
    const emailVerification =
      emailVerificationEnabled && emailVerificationSecret
        ? new EmailVerificationService(emailVerificationSecret, this.options.emailVerification)
        : null

    if (emailVerification) {
      core.container.instance(exposeEmailVerificationAs, emailVerification)
      core.services.set(exposeEmailVerificationAs, emailVerification)
    }

    core.app.use('*', async (c: Context, next: Next) => {
      // Create a map of resolvers from bindings
      const resolvers = new Map<string, UserProviderResolver>()
      if (bindings?.providers) {
        for (const [key, value] of Object.entries(bindings.providers)) {
          resolvers.set(key, value)
        }
      }

      const manager = new AuthManager(c, this.options, resolvers)

      c.set(exposeAs, manager)
      c.set(
        exposeGateAs,
        this.gate.forUser(async () => await manager.user())
      )
      c.set(exposeHashAs, hash)
      if (passwordBroker) {
        c.set(exposePasswordBrokerAs, passwordBroker)
      }
      if (emailVerification) {
        c.set(exposeEmailVerificationAs, emailVerification)
      }

      await next()
    })
  }
}

// Module augmentation for Hono (backward compatibility)
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthManager
    gate: Gate
    hash: HashManager
    passwords?: PasswordBroker
    emailVerification?: EmailVerificationService
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module 'gravito-core' {
  interface GravitoVariables {
    /** Authentication manager for user authentication */
    auth?: AuthManager
    /** Authorization gate for permission checks */
    gate?: Gate
    /** Hash manager for password hashing */
    hash?: HashManager
    /** Password reset broker */
    passwords?: PasswordBroker
    /** Email verification service */
    emailVerification?: EmailVerificationService
  }
}

/**
 * Functional style plugin (if needed)
 */
export default function orbitAuth(core: PlanetCore, options: OrbitAuthOptions) {
  new OrbitAuth(options).install(core)
}
