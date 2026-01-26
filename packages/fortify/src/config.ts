import type { Model } from '@gravito/atlas'

/**
 * Rate limiting configuration for authentication actions.
 * @public
 */
export interface RateLimitConfig {
  /** Login rate limiting. */
  login?: {
    /** Maximum number of attempts allowed. */
    maxAttempts: number
    /** Time period for decay in minutes. */
    decayMinutes: number
    /** Lockout duration in minutes when threshold reached. */
    lockoutMinutes: number
  }
  /** Password reset rate limiting. */
  passwordReset?: {
    maxAttempts: number
    decayMinutes: number
    lockoutMinutes: number
  }
  /** Email verification rate limiting. */
  emailVerification?: {
    maxAttempts: number
    decayMinutes: number
    lockoutMinutes: number
  }
}

/**
 * Account lockout configuration.
 * @public
 */
export interface LockoutConfig {
  /** Whether account lockout is enabled. */
  enabled?: boolean
  /** Number of failed attempts before lockout. */
  threshold?: number
  /** Duration of lockout in minutes. */
  duration?: number
  /** Permanent lockout settings. */
  permanent?: {
    /** Whether permanent lockout is enabled. */
    enabled: boolean
    /** Number of failed attempts before permanent lockout. */
    threshold: number
  }
}

/**
 * Password strength and validation rules.
 * @public
 */
export interface PasswordRulesConfig {
  /** Minimum password length. */
  minLength?: number
  /** Maximum password length. */
  maxLength?: number
  /** Whether an uppercase letter is required. */
  requireUppercase?: boolean
  /** Whether a lowercase letter is required. */
  requireLowercase?: boolean
  /** Whether a numeric digit is required. */
  requireNumbers?: boolean
  /** Whether a special symbol is required. */
  requireSymbols?: boolean
  /** Whether to prevent common/weak passwords. */
  preventCommon?: boolean
  /** Number of previous passwords to prevent reuse of. */
  preventReuse?: number
}

/**
 * HTTP Security Headers configuration.
 * @public
 */
export interface SecurityHeadersConfig {
  /** HTTP Strict Transport Security (HSTS). */
  hsts?: {
    enabled: boolean
    maxAge: number
    includeSubDomains?: boolean
    preload?: boolean
  }
  /** Content Security Policy (CSP). */
  csp?: {
    enabled: boolean
    directives: Record<string, string[]>
  }
  /** X-Content-Type-Options: nosniff. */
  noSniff?: boolean
  /** X-Frame-Options. */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false
  /** X-XSS-Protection. */
  xssFilter?: boolean
  /** Custom X-XSS-Protection header value. */
  xssProtection?: string
}

/**
 * General security settings for Fortify.
 * @public
 */
export interface SecurityConfig {
  /** Rate limiting settings. */
  rateLimit?: RateLimitConfig
  /** Account lockout settings. */
  lockout?: LockoutConfig
  /** Password validation rules. */
  passwordRules?: PasswordRulesConfig
  /** Security header settings. */
  securityHeaders?: SecurityHeadersConfig
  /** Authentication event logging settings. */
  logging?: {
    /** Whether logging is enabled. */
    enabled?: boolean
    /** Storage driver for logs. */
    driver?: 'database' | 'file' | 'custom'
  }
  /** Session security settings. */
  session?: {
    /** Whether to regenerate session ID on login. */
    regenerateOnLogin?: boolean
    /** Session lifetime in seconds. */
    lifetime?: number
    /** Whether to use secure cookies. */
    secure?: boolean
  }
}

/**
 * OAuth/Social login configuration.
 * @public
 */
export interface OAuthConfig {
  /** Map of provider names to their configurations. */
  providers: {
    [provider: string]: {
      /** OAuth Client ID. */
      clientId: string
      /** OAuth Client Secret. */
      clientSecret: string
      /** OAuth Redirect URI. */
      redirectUri: string
      /** Optional OAuth scopes. */
      scopes?: string[]
    }
  }
}

/**
 * Two-Factor Authentication (2FA) configuration.
 * @public
 */
export interface TwoFactorConfig {
  /** Whether 2FA is enabled. */
  enabled?: boolean
  /** Issuer name shown in authenticator apps. */
  issuer?: string
  /** Time window for OTP verification (default: 1). */
  window?: number
  /** Whether to require password confirmation for 2FA actions. */
  confirmPassword?: boolean
}

/**
 * Magic Link login configuration.
 * @public
 */
export interface MagicLinkConfig {
  /** Whether Magic Link login is enabled. */
  enabled?: boolean
  /** Token expiration time in minutes. */
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
