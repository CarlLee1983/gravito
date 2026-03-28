/**
 * @fileoverview Flare error codes
 *
 * Namespaced error codes for the Flare notification module.
 *
 * @module @gravito/flare/errors
 */

/**
 * Error codes for Flare module operations.
 * Follows dot-separated namespace convention.
 */
export const FlareErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'flare.rate_limit_exceeded',
  SERIALIZATION_FAILED: 'flare.serialization_failed',
  TEMPLATE_NOT_DEFINED: 'flare.template_not_defined',
  NOTIFIABLE_MISSING_EMAIL: 'flare.notifiable_missing_email',
  INVALID_CONFIG: 'flare.invalid_config',
  NOTIFICATION_METHOD_NOT_IMPLEMENTED: 'flare.notification_method_not_implemented',
  UNSUPPORTED_PROVIDER: 'flare.unsupported_provider',
  CREDENTIALS_MISSING: 'flare.credentials_missing',
  SEND_FAILED: 'flare.send_failed',
} as const

export type FlareErrorCode = (typeof FlareErrorCodes)[keyof typeof FlareErrorCodes]
