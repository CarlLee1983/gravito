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

export interface OAuthConfig {
  providers: {
    [provider: string]: {
      clientId: string
      clientSecret: string
      redirectUri: string
      scopes?: string[]
    }
  }
}

export interface TwoFactorConfig {
  enabled?: boolean
  issuer?: string
  window?: number
  confirmPassword?: boolean
}

export interface MagicLinkConfig {
  enabled?: boolean
  expiresInMinutes?: number
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
    /** Whether to enable OAuth/Social login. (Default: false) */
    oauth?: boolean
    /** Whether to enable Magic Link login. (Default: false) */
    magicLink?: boolean
  }

  /**
   * Redirect paths for various authentication actions.
   */
  redirects: {
    login?: string
    logout?: string
    register?: string
    passwordReset?: string
    emailVerification?: string
  }

  /**
   * User model factory.
   */
  userModel: () => typeof Model

  /**
   * Username field (default: 'email').
   */
  username?: string

  /**
   * Password field (default: 'password').
   */
  password?: string

  /**
   * Route prefix (default: '').
   */
  prefix?: string

  /**
   * JSON mode for SPA (default: false).
   */
  jsonMode?: boolean

  /**
   * CSRF protection enabled (default: true).
   */
  csrf?: boolean

  /**
   * Custom view templates.
   */
  views?: {
    login?: string
    register?: string
    forgotPassword?: string
    resetPassword?: string
    verifyEmail?: string
  }

  /**
   * Security configuration.
   */
  security?: SecurityConfig

  /**
   * OAuth configuration.
   */
  oauth?: OAuthConfig

  /**
   * Magic Link configuration.
   */
  magicLink?: MagicLinkConfig

  /**
   * Two Factor Authentication configuration.
   */
  twoFactor?: TwoFactorConfig
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
    oauth: false,
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
  twoFactor: {
    enabled: false,
    issuer: 'Gravito',
    window: 1,
    confirmPassword: true,
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
    twoFactor: {
      ...defaultFortifyConfig.twoFactor,
      ...config.twoFactor,
    },
  }
}
