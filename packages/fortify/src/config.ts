import type { Model } from '@gravito/atlas'

/**
 * Fortify configuration options
 */
/**
 * Configuration options for the Fortify authentication orbit.
 * @public
 */
export interface FortifyConfig {
  /**
   * Feature flags to enable/disable specific authentication flows.
   */
  features: {
    /** Whether to allow new user registration. (Default: true) */
    registration?: boolean
    /** Whether to allow users to reset their passwords. (Default: true) */
    resetPasswords?: boolean
    /** Whether to require email verification. (Default: false) */
    emailVerification?: boolean
    /** Whether to allow users to update their profile information. (Default: false) */
    updateProfileInformation?: boolean
    /** Whether to allow users to update their passwords. (Default: false) */
    updatePasswords?: boolean
    /** Whether to enable two-factor authentication features. (Default: false) */
    twoFactorAuthentication?: boolean
  }

  /**
   * Post-authentication redirect targets.
   */
  redirects: {
    /** Where to send the user after successful login. (Default: '/dashboard') */
    login?: string
    /** Where to send the user after logging out. (Default: '/') */
    logout?: string
    /** Where to send the user after successful registration. (Default: '/dashboard') */
    register?: string
    /** Where to send the user after a successful password reset. (Default: '/login') */
    passwordReset?: string
    /** Where to send the user after successful email verification. (Default: '/dashboard') */
    emailVerification?: string
  }

  /**
   * Custom view/template paths for overriding the default UI.
   */
  views?: {
    /** Path to login template */
    login?: string
    /** Path to registration template */
    register?: string
    /** Path to forgot password template */
    forgotPassword?: string
    /** Path to reset password template */
    resetPassword?: string
    /** Path to email verification instruction template */
    verifyEmail?: string
  }

  /**
   * A factory function that returns the Atlas Model class representing the User.
   */
  userModel: () => typeof Model

  /**
   * The database column used as the unique username/identifier (e.g., 'email', 'username').
   * (Default: 'email')
   */
  username?: string

  /**
   * The database column used for storing the hashed password.
   * (Default: 'password')
   */
  password?: string

  /**
   * Optional URL prefix for all authentication routes (e.g., '/auth').
   * (Default: '')
   */
  prefix?: string

  /**
   * If true, Fortify will return JSON responses (CBOR compatible) instead of redirects.
   * Useful for Single Page Applications (SPA) or mobile apps.
   * (Default: false)
   */
  jsonMode?: boolean

  /**
   * Enable or configure Cross-Site Request Forgery (CSRF) protection for form submissions.
   * (Default: true)
   */
  csrf?: boolean | import('@gravito/core').CsrfOptions
}

/**
 * Default Fortify configuration
 */
export const defaultFortifyConfig: Partial<FortifyConfig> = {
  features: {
    registration: true,
    resetPasswords: true,
    emailVerification: false,
    updateProfileInformation: false,
    updatePasswords: false,
    twoFactorAuthentication: false,
  },
  redirects: {
    login: '/dashboard',
    logout: '/',
    register: '/dashboard',
    passwordReset: '/login',
    emailVerification: '/dashboard',
  },
  username: 'email',
  password: 'password',
  prefix: '',
  jsonMode: false,
  csrf: true,
}

/**
 * Define Fortify configuration with type safety
 */
export function definefortifyConfig(config: FortifyConfig): FortifyConfig {
  return {
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
  }
}
