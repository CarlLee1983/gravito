/**
 * Structured error codes for @gravito/signal mail operations.
 * Follows fortify's dot-separated namespace convention.
 *
 * NOTE: This replaces MailErrorCode enum for new code.
 * The existing enum in ../errors.ts remains until Phase 18-19 migration.
 *
 * @public
 */
export const MailErrorCodes = {
  CONNECTION_FAILED: 'mail.connection_failed',
  AUTH_FAILED: 'mail.auth_failed',
  RECIPIENT_REJECTED: 'mail.recipient_rejected',
  MESSAGE_REJECTED: 'mail.message_rejected',
  RATE_LIMIT: 'mail.rate_limit',
  SEND_FAILED: 'mail.send_failed',
  UNKNOWN: 'mail.unknown',
} as const

export type MailErrorCode = (typeof MailErrorCodes)[keyof typeof MailErrorCodes]
