import { InfrastructureException } from '@gravito/core'
import { MailErrorCodes, type MailErrorCode as MailErrorCodeType } from './errors/codes'

/**
 * Mail transport error codes (legacy enum — kept for backward compat).
 * New code should use MailErrorCodes from './errors/codes' instead.
 *
 * @deprecated Use MailErrorCodes from './errors/codes'
 * @public
 * @since 3.1.0
 */
export enum MailErrorCode {
  /** Connection to mail server failed */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** Authentication with mail server failed */
  AUTH_FAILED = 'AUTH_FAILED',
  /** One or more recipients were rejected by the server */
  RECIPIENT_REJECTED = 'RECIPIENT_REJECTED',
  /** The message was rejected by the server */
  MESSAGE_REJECTED = 'MESSAGE_REJECTED',
  /** Rate limit exceeded */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Unknown or unclassified error */
  UNKNOWN = 'UNKNOWN',
}

// Map legacy enum to new mail.* namespaced codes for backward compat
const legacyToNewCode: Record<MailErrorCode, string> = {
  [MailErrorCode.CONNECTION_FAILED]: MailErrorCodes.CONNECTION_FAILED,
  [MailErrorCode.AUTH_FAILED]: MailErrorCodes.AUTH_FAILED,
  [MailErrorCode.RECIPIENT_REJECTED]: MailErrorCodes.RECIPIENT_REJECTED,
  [MailErrorCode.MESSAGE_REJECTED]: MailErrorCodes.MESSAGE_REJECTED,
  [MailErrorCode.RATE_LIMIT]: MailErrorCodes.RATE_LIMIT,
  [MailErrorCode.UNKNOWN]: MailErrorCodes.UNKNOWN,
}

// Transient codes that should be retried (connection issues and rate limits)
const RETRYABLE_CODES = new Set<string>([
  MailErrorCodes.CONNECTION_FAILED,
  MailErrorCodes.RATE_LIMIT,
])

/**
 * Error class for mail transport failures.
 *
 * Extends InfrastructureException for unified error handling across Gravito.
 * Carries a `retryable` flag indicating whether the operation can be retried,
 * and preserves backward compat with the legacy MailErrorCode enum via `.legacyCode`.
 *
 * @example
 * ```typescript
 * throw new MailTransportError(
 *   'Failed to connect to SMTP server',
 *   MailErrorCode.CONNECTION_FAILED,
 *   originalError
 * )
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class MailTransportError extends InfrastructureException {
  /**
   * Legacy enum code — preserved for backward compat with callers that switch on MailErrorCode.
   * @deprecated Prefer checking `.code` (mail.* namespaced string) instead.
   */
  public readonly legacyCode: MailErrorCode

  /**
   * Create a new mail transport error.
   *
   * Accepts both the legacy MailErrorCode enum and new mail.* namespaced string codes.
   *
   * @param message - Human-readable error message
   * @param code - Categorized error code (legacy enum or new mail.* string)
   * @param cause - Original error that caused this failure
   *
   * @example
   * ```typescript
   * const error = new MailTransportError('Auth failed', MailErrorCode.AUTH_FAILED);
   * ```
   */
  constructor(
    message: string,
    code: MailErrorCode | MailErrorCodeType = MailErrorCode.UNKNOWN,
    cause?: Error
  ) {
    // Resolve the new-style mail.* namespaced code
    const newCode =
      typeof code === 'string' && code.startsWith('mail.')
        ? code
        : legacyToNewCode[code as MailErrorCode] ?? MailErrorCodes.UNKNOWN

    super(502, newCode, {
      message,
      cause,
      retryable: RETRYABLE_CODES.has(newCode),
    })

    this.name = 'MailTransportError'

    // Resolve legacy enum code from the new-style code (for backward compat)
    this.legacyCode =
      typeof code === 'string' && code.startsWith('mail.')
        ? ((Object.entries(legacyToNewCode).find(([, v]) => v === code)?.[0] as MailErrorCode) ??
          MailErrorCode.UNKNOWN)
        : (code as MailErrorCode)

    // Per Pitfall 5: setPrototypeOf FIRST ensures instanceof works across ESM/CJS boundaries
    Object.setPrototypeOf(this, new.target.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MailTransportError)
    }
  }
}
