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
}
