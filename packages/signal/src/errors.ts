/**
 * Mail transport error codes.
 *
 * Categorizes common failure modes in the mail delivery process to allow
 * for programmatic handling (e.g., retries on rate limits).
 *
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

/**
 * Error class for mail transport failures.
 *
 * Provides structured error information for mail sending failures,
 * including error codes and original cause tracking for debugging.
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
export class MailTransportError extends Error {
  /**
   * Create a new mail transport error.
   *
   * @param message - Human-readable error message
   * @param code - Categorized error code
   * @param cause - Original error that caused this failure
   *
   * @example
   * ```typescript
   * const error = new MailTransportError('Auth failed', MailErrorCode.AUTH_FAILED);
   * ```
   */
  constructor(
    message: string,
    public readonly code: MailErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MailTransportError'

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MailTransportError)
    }
  }
}
