import type { Model } from '@gravito/atlas'

export interface RateLimitConfig {
  login?: {
    maxAttempts: number
    decayMinutes: number
    lockoutMinutes: number
  }
  passwordReset?: {
    maxAttempts: number
    decayMinutes: number
    lockoutMinutes: number
  }
  emailVerification?: {
    maxAttempts: number
    decayMinutes: number
    lockoutMinutes: number
  }
}

export interface LockoutConfig {
  enabled?: boolean
  threshold?: number
  duration?: number
  permanent?: {
    enabled: boolean
    threshold: number
  }
}

export interface PasswordRulesConfig {
  minLength?: number
  maxLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumbers?: boolean
  requireSymbols?: boolean
  preventCommon?: boolean
  preventReuse?: number
}

export interface SecurityHeadersConfig {
  hsts?: {
    enabled: boolean
    maxAge: number
    includeSubDomains?: boolean
    preload?: boolean
  }
  csp?: {
    enabled: boolean
    directives: Record<string, string[]>
  }
  noSniff?: boolean
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false
  xssFilter?: boolean
  xssProtection?: string
}

export interface SecurityConfig {
  rateLimit?: RateLimitConfig
  lockout?: LockoutConfig
  passwordRules?: PasswordRulesConfig
  securityHeaders?: SecurityHeadersConfig
  logging?: {
    enabled?: boolean
    driver?: 'database' | 'file' | 'custom'
  }
  session?: {
    regenerateOnLogin?: boolean
    lifetime?: number
    secure?: boolean
  }
}

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
    /** Whether to enable API token authentication (Sanctum-style). (Default: false) */
    apiTokens?: boolean
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

  /**
   * Security configuration for rate limiting, password rules, headers, etc.
   */
  security?: SecurityConfig
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
    apiTokens: false,
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
  security: {
    rateLimit: {
      login: { maxAttempts: 5, decayMinutes: 15, lockoutMinutes: 30 },
      passwordReset: { maxAttempts: 3, decayMinutes: 60, lockoutMinutes: 60 },
      emailVerification: { maxAttempts: 5, decayMinutes: 60, lockoutMinutes: 30 },
    },
    lockout: {
      enabled: true,
      threshold: 5,
      duration: 30,
      permanent: { enabled: false, threshold: 20 },
    },
    passwordRules: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      preventCommon: true,
      preventReuse: 5,
    },
    securityHeaders: {
      hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true },
      csp: { enabled: false, directives: {} },
      noSniff: true,
      frameOptions: 'SAMEORIGIN',
      xssFilter: true,
    },
    logging: { enabled: true, driver: 'database' },
    session: { regenerateOnLogin: true, lifetime: 7200, secure: true },
  },
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
  }
}
