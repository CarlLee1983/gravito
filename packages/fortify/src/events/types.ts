export interface LoginEvent {
  user: any
  ip: string
  userAgent: string
  remember?: boolean
  timestamp: Date
}

export interface LogoutEvent {
  userId?: number
  email?: string
  ip: string
  userAgent: string
  timestamp: Date
}

export interface RegisterEvent {
  user: any
  ip: string
  userAgent: string
  timestamp: Date
}

export interface PasswordResetRequestedEvent {
  email: string
  ip: string
  userAgent: string
  timestamp: Date
}

export interface PasswordResetEvent {
  user: any
  ip: string
  userAgent: string
  timestamp: Date
}

export interface EmailVerifiedEvent {
  user: any
  ip: string
  userAgent: string
  timestamp: Date
}

export interface EmailVerificationSentEvent {
  userId: number
  email: string
  ip: string
  userAgent: string
  timestamp: Date
}

export interface LoginFailedEvent {
  email: string
  ip: string
  userAgent: string
  reason: string
  timestamp: Date
}

export interface AccountLockedEvent {
  userId: number
  email: string
  lockedUntil?: Date
  permanent: boolean
  ip: string
  userAgent: string
  timestamp: Date
}

export interface TokenCreatedEvent {
  user: any
  token: {
    id: number
    name: string
  }
  ip: string
  userAgent: string
  timestamp: Date
}

export interface TokenRevokedEvent {
  user: any
  token: {
    id: number
    name: string
  }
  ip: string
  userAgent: string
  timestamp: Date
}

export interface AllTokensRevokedEvent {
  user: any
  count: number
  ip: string
  userAgent: string
  timestamp: Date
}

export interface OAuthLoginEvent {
  user: any
  provider: string
  oauthUser: any
  ip: string
  userAgent: string
  timestamp: Date
}

export interface OAuthFailedEvent {
  provider: string
  error: unknown
  ip: string
  userAgent: string
  timestamp: Date
}

export interface TwoFactorEvent {
  user: any
  ip: string
  userAgent: string
  timestamp: Date
}

export interface MagicLinkEvent {
  user: any
  token?: string
  ip: string
  userAgent: string
  timestamp: Date
}

export interface FortifyEvents {
  'auth:login': LoginEvent
  'auth:logout': LogoutEvent
  'auth:register': RegisterEvent
  'auth:password-reset-requested': PasswordResetRequestedEvent
  'auth:password-reset': PasswordResetEvent
  'auth:email-verified': EmailVerifiedEvent
  'auth:email-verification-sent': EmailVerificationSentEvent
  'auth:login-failed': LoginFailedEvent
  'auth:account-locked': AccountLockedEvent
  'auth:token-created': TokenCreatedEvent
  'auth:token-revoked': TokenRevokedEvent
  'auth:all-tokens-revoked': AllTokensRevokedEvent
  'auth:oauth-login': OAuthLoginEvent
  'auth:oauth-failed': OAuthFailedEvent
  'auth:two-factor-enabled': TwoFactorEvent
  'auth:two-factor-disabled': TwoFactorEvent
  'auth:two-factor-verified': TwoFactorEvent
  'auth:magic-link-sent': MagicLinkEvent
  'auth:magic-link-login': MagicLinkEvent
}
