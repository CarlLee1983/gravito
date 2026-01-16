/**
 * @fileoverview Orbit Auth - Authentication & Authorization for Gravito
 *
 * Provides comprehensive authentication with multiple guards, password
 * reset, email verification, and authorization gates.
 *
 * @module @gravito/sentinel
 * @since 1.0.0
 */

import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
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

/**
 * Options for configuring Orbit Sentinel (Auth).
 * @public
 */
export interface OrbitSentinelOptions extends AuthConfig {
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

/**
 * Orbit Sentinel Service.
 * Provides the main installation point for Sentinel into Gravito.
 * @public
 */
export class OrbitSentinel implements GravitoOrbit {
  public readonly gate: Gate

  constructor(private options: OrbitSentinelOptions) {
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

    logger.info(`[OrbitSentinel] Initializing Auth (Exposed as: ${exposeAs})`)

    const hash = new HashManager(this.options.hash)
    core.container.instance(exposeHashAs, hash)

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
    }

    const emailVerificationEnabled = this.options.emailVerification?.enabled ?? false
    const appKeyFromCore =
      (core.config.has('APP_KEY') ? core.config.get<string>('APP_KEY') : undefined) ||
      process.env.APP_KEY
    const emailVerificationSecret = this.options.emailVerification?.secret ?? appKeyFromCore

    if (emailVerificationEnabled && !emailVerificationSecret) {
      logger.warn(
        '[OrbitSentinel] Email verification is enabled but no secret was found. Verification will be DISABLED. Please set APP_KEY or emailVerification.secret.'
      )
    }

    const emailVerification =
      emailVerificationEnabled && emailVerificationSecret
        ? new EmailVerificationService(emailVerificationSecret, this.options.emailVerification)
        : null

    if (emailVerification) {
      core.container.instance(exposeEmailVerificationAs, emailVerification)
    }

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
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
      return await next()
    })
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module '@gravito/core' {
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
export default function orbitAuth(core: PlanetCore, options: OrbitSentinelOptions) {
  new OrbitSentinel(options).install(core)
}
