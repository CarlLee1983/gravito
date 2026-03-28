/**
 * @fileoverview Orbit Sentinel - Comprehensive Authentication & Authorization for Gravito.
 *
 * This module provides a robust, multi-guard authentication system inspired by
 * Laravel's auth architecture. It supports session-based, JWT-based, and token-based
 * authentication, along with authorization gates, password management, and email
 * verification.
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
export * from './contracts/SessionRepository'
export * from './contracts/SocialUserProvider'
export * from './contracts/UserProvider'
export * from './contracts/WebAuthn'
export * from './EmailVerification'
export * from './Gate'
export * from './guards/JwtGuard'
export * from './guards/SessionGuard'
export * from './guards/TokenGuard'
export * from './HashManager'
export * from './middleware/auth'
export * from './middleware/can'
export * from './middleware/guest'
export * from './middleware/permission'
export * from './middleware/role'
export * from './middleware/throttleAuth'
export * from './PasswordBroker'
export * from './providers/CallbackSocialUserProvider'
export * from './providers/CallbackUserProvider'
export * from './RedisTokenBlacklist'
export * from './errors'

/**
 * Options for configuring the OrbitSentinel service.
 * @public
 */
export interface OrbitSentinelOptions extends AuthConfig {
  /** Property name used to expose AuthManager in the context */
  exposeAs?: string
  /** Property name used to expose Gate in the context */
  exposeGateAs?: string
  /** Property name used to expose HashManager in the context */
  exposeHashAs?: string
  /** Property name used to expose PasswordBroker in the context */
  exposePasswordBrokerAs?: string
  /** Property name used to expose EmailVerificationService in the context */
  exposeEmailVerificationAs?: string

  /** Hashing configuration */
  hash?: HashConfig
  /** Password reset configuration */
  passwordReset?: {
    enabled?: boolean
    repository?: PasswordResetTokenRepository
  } & PasswordBrokerOptions
  /** Email verification configuration */
  emailVerification?: { enabled?: boolean; secret?: string } & EmailVerificationOptions

  /** Custom dependency bindings */
  bindings?: {
    /** Map of user provider factory functions */
    providers?: Record<string, UserProviderResolver>
  }
}

/**
 * OrbitSentinel Service - The main entry point for Gravito authentication.
 *
 * This class implements the GravitoOrbit interface and is responsible for
 * initializing and mounting the authentication and authorization services
 * into the PlanetCore application.
 *
 * @public
 * @example
 * ```typescript
 * const auth = new OrbitSentinel(config);
 * auth.install(core);
 * ```
 */
export class OrbitSentinel implements GravitoOrbit {
  /** The global authorization gate instance */
  public readonly gate: Gate

  constructor(private options: OrbitSentinelOptions) {
    this.gate = new Gate()
  }

  /**
   * Install the Sentinel service into the core application.
   *
   * @param core - The PlanetCore instance
   */
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
 * Functional style plugin for registering Sentinel.
 *
 * @param core - The PlanetCore instance
 * @param options - Configuration options
 */
export default function orbitAuth(core: PlanetCore, options: OrbitSentinelOptions) {
  new OrbitSentinel(options).install(core)
}
