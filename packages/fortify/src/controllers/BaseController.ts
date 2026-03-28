import type { GravitoContext } from '@gravito/core'
import type { FortifyConfig } from '../config'
import { ensureCsrfToken } from '../csrf'
import { type ErrorCode, ErrorCodes } from '../errors/codes'
import { FortifyError } from '../errors/FortifyError'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import type { ViewService } from '../types'

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Account locked',
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: 'Email not verified',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Session expired',
  [ErrorCodes.AUTH_UNAUTHENTICATED]: 'Unauthenticated',
  [ErrorCodes.REG_EMAIL_TAKEN]: 'Email already taken',
  [ErrorCodes.REG_WEAK_PASSWORD]: 'Password too weak',
  [ErrorCodes.REG_INVALID_EMAIL]: 'Invalid email address',
  [ErrorCodes.REG_PASSWORD_MISMATCH]: 'Passwords do not match',
  [ErrorCodes.REG_VALIDATION_FAILED]: 'Validation failed',
  [ErrorCodes.PWD_TOKEN_INVALID]: 'Invalid token',
  [ErrorCodes.PWD_TOKEN_EXPIRED]: 'Token expired',
  [ErrorCodes.PWD_MISMATCH]: 'Passwords do not match',
  [ErrorCodes.PWD_USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.VER_ALREADY_VERIFIED]: 'Already verified',
  [ErrorCodes.VER_INVALID_SIGNATURE]: 'Invalid signature',
  [ErrorCodes.VER_LINK_EXPIRED]: 'Link expired',
  [ErrorCodes.VER_USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.VER_INVALID_LINK]: 'Invalid link',
  [ErrorCodes.RATE_TOO_MANY_ATTEMPTS]: 'Too many attempts',
  [ErrorCodes.RATE_COOLDOWN]: 'Please wait before trying again',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCodes.OAUTH_UNKNOWN_PROVIDER]: 'Unknown provider',
  [ErrorCodes.OAUTH_INVALID_STATE]: 'Invalid state',
  [ErrorCodes.OAUTH_AUTHENTICATION_FAILED]: 'Authentication failed',
  [ErrorCodes.TFA_INVALID_CODE]: 'Invalid two-factor authentication code',
  [ErrorCodes.TFA_SESSION_EXPIRED]: 'Two-factor authentication session expired',
  [ErrorCodes.TFA_INVALID_RECOVERY_CODE]: 'Invalid recovery code',
  [ErrorCodes.MAGIC_LINK_INVALID]: 'Invalid or expired magic link',
}

export abstract class BaseController {
  constructor(
    protected config: FortifyConfig,
    protected events?: FortifyEventEmitter
  ) {}

  protected success(
    c: GravitoContext,
    data?: unknown,
    message?: string,
    redirectTo?: string
  ): Response {
    if (this.config.jsonMode) {
      return c.json({ success: true, message, data }, 200)
    }
    return c.redirect(redirectTo ?? this.config.redirects.login ?? '/dashboard')
  }

  protected error(
    c: GravitoContext,
    error: FortifyError | ErrorCode,
    redirectTo?: string
  ): Response {
    const fortifyError = error instanceof FortifyError ? error : new FortifyError(error, 422)

    const message = this.getErrorMessage(fortifyError.code as ErrorCode)

    if (this.config.jsonMode) {
      return c.json(
        {
          success: false,
          error: {
            code: fortifyError.code,
            message,
            details: fortifyError.details,
          },
        },
        fortifyError.httpStatus
      )
    }

    const url = redirectTo ?? c.req.url
    const urlObj = new URL(url, `http://${c.req.header('host') ?? 'localhost'}`)
    urlObj.searchParams.set('error', fortifyError.code)
    return c.redirect(urlObj.pathname + urlObj.search)
  }

  protected validationError(c: GravitoContext, errors: Record<string, string[]>): Response {
    return this.error(c, FortifyError.validationFailed(errors))
  }

  protected render(c: GravitoContext, view: string, props: Record<string, unknown> = {}): Response {
    const viewService = c.get('view') as ViewService | undefined

    const csrfToken = ensureCsrfToken(c, this.config)
    const viewProps = { ...props, csrfToken }

    if (viewService?.render) {
      return c.html(viewService.render(view, viewProps))
    }

    return c.json({ view, props: viewProps })
  }

  protected getErrorMessage(code: ErrorCode): string {
    return ERROR_MESSAGES[code] ?? 'Unknown error'
  }

  protected getCsrfToken(c: GravitoContext): string | null {
    return ensureCsrfToken(c, this.config)
  }
}
