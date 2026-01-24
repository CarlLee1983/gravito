import { type ErrorCode, ErrorCodes } from './codes'

export class FortifyError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number = 422,
    public readonly details?: unknown
  ) {
    super(code)
    this.name = 'FortifyError'
  }

  static invalidCredentials() {
    return new FortifyError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)
  }

  static accountLocked(unlockAt?: Date) {
    return new FortifyError(ErrorCodes.AUTH_ACCOUNT_LOCKED, 423, { unlockAt })
  }

  static emailNotVerified() {
    return new FortifyError(ErrorCodes.AUTH_EMAIL_NOT_VERIFIED, 403)
  }

  static sessionExpired() {
    return new FortifyError(ErrorCodes.AUTH_SESSION_EXPIRED, 401)
  }

  static unauthenticated() {
    return new FortifyError(ErrorCodes.AUTH_UNAUTHENTICATED, 401)
  }

  static emailTaken() {
    return new FortifyError(ErrorCodes.REG_EMAIL_TAKEN, 422)
  }

  static weakPassword(reasons?: string[]) {
    return new FortifyError(ErrorCodes.REG_WEAK_PASSWORD, 422, { reasons })
  }

  static invalidEmail() {
    return new FortifyError(ErrorCodes.REG_INVALID_EMAIL, 422)
  }

  static passwordMismatch() {
    return new FortifyError(ErrorCodes.REG_PASSWORD_MISMATCH, 422)
  }

  static validationFailed(errors: Record<string, string[]>) {
    return new FortifyError(ErrorCodes.REG_VALIDATION_FAILED, 422, { errors })
  }

  static invalidToken() {
    return new FortifyError(ErrorCodes.PWD_TOKEN_INVALID, 422)
  }

  static tokenExpired() {
    return new FortifyError(ErrorCodes.PWD_TOKEN_EXPIRED, 422)
  }

  static passwordsDontMatch() {
    return new FortifyError(ErrorCodes.PWD_MISMATCH, 422)
  }

  static userNotFound() {
    return new FortifyError(ErrorCodes.PWD_USER_NOT_FOUND, 404)
  }

  static alreadyVerified() {
    return new FortifyError(ErrorCodes.VER_ALREADY_VERIFIED, 200)
  }

  static invalidSignature() {
    return new FortifyError(ErrorCodes.VER_INVALID_SIGNATURE, 422)
  }

  static linkExpired() {
    return new FortifyError(ErrorCodes.VER_LINK_EXPIRED, 422)
  }

  static verificationUserNotFound() {
    return new FortifyError(ErrorCodes.VER_USER_NOT_FOUND, 404)
  }

  static invalidLink() {
    return new FortifyError(ErrorCodes.VER_INVALID_LINK, 422)
  }

  static tooManyAttempts(retryAfter?: number) {
    return new FortifyError(ErrorCodes.RATE_TOO_MANY_ATTEMPTS, 429, { retryAfter })
  }

  static cooldown(retryAfter: number) {
    return new FortifyError(ErrorCodes.RATE_COOLDOWN, 429, { retryAfter })
  }

  static internal(error?: unknown) {
    return new FortifyError(ErrorCodes.INTERNAL_ERROR, 500, { error })
  }

  static unknownProvider() {
    return new FortifyError(ErrorCodes.OAUTH_UNKNOWN_PROVIDER, 404)
  }

  static invalidState() {
    return new FortifyError(ErrorCodes.OAUTH_INVALID_STATE, 401)
  }

  static authenticationFailed() {
    return new FortifyError(ErrorCodes.OAUTH_AUTHENTICATION_FAILED, 401)
  }
}
