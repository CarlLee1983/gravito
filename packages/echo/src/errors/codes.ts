/**
 * @fileoverview Echo error codes
 *
 * Namespaced error codes for the Echo webhook module.
 *
 * @module @gravito/echo/errors
 */

/**
 * Error codes for Echo module operations.
 * Follows dot-separated namespace convention.
 */
export const EchoErrorCodes = {
  UNKNOWN_PROVIDER: 'echo.unknown_provider',
  KEY_ROTATION_NOT_SET: 'echo.key_rotation_not_set',
  NO_PRIMARY_KEY: 'echo.no_primary_key',
  KEY_ROTATION_NOT_ENABLED: 'echo.key_rotation_not_enabled',
  NO_DELIVERY_ATTEMPTS: 'echo.no_delivery_attempts',
  INVALID_CONFIG: 'echo.invalid_config',
} as const

export type EchoErrorCode = (typeof EchoErrorCodes)[keyof typeof EchoErrorCodes]
