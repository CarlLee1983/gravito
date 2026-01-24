export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'auth.invalid_credentials',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  AUTH_EMAIL_NOT_VERIFIED: 'auth.email_not_verified',
  AUTH_SESSION_EXPIRED: 'auth.session_expired',
  AUTH_UNAUTHENTICATED: 'auth.unauthenticated',

  REG_EMAIL_TAKEN: 'reg.email_taken',
  REG_WEAK_PASSWORD: 'reg.weak_password',
  REG_INVALID_EMAIL: 'reg.invalid_email',
  REG_PASSWORD_MISMATCH: 'reg.password_mismatch',
  REG_VALIDATION_FAILED: 'reg.validation_failed',

  PWD_TOKEN_INVALID: 'pwd.token_invalid',
  PWD_TOKEN_EXPIRED: 'pwd.token_expired',
  PWD_MISMATCH: 'pwd.mismatch',
  PWD_USER_NOT_FOUND: 'pwd.user_not_found',

  VER_ALREADY_VERIFIED: 'ver.already_verified',
  VER_INVALID_SIGNATURE: 'ver.invalid_signature',
  VER_LINK_EXPIRED: 'ver.link_expired',
  VER_USER_NOT_FOUND: 'ver.user_not_found',
  VER_INVALID_LINK: 'ver.invalid_link',

  RATE_TOO_MANY_ATTEMPTS: 'rate.too_many_attempts',
  RATE_COOLDOWN: 'rate.cooldown',

  INTERNAL_ERROR: 'internal.error',

  OAUTH_UNKNOWN_PROVIDER: 'oauth.unknown_provider',
  OAUTH_INVALID_STATE: 'oauth.invalid_state',
  OAUTH_AUTHENTICATION_FAILED: 'oauth.authentication_failed',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
