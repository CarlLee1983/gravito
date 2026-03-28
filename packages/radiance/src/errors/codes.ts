/**
 * @fileoverview Radiance error codes
 *
 * Namespaced error codes for the Radiance broadcasting module.
 *
 * @module @gravito/radiance/errors
 */

/**
 * Error codes for Radiance module operations.
 * Follows dot-separated namespace convention.
 */
export const RadianceErrorCodes = {
  BROADCAST_FAILED: 'radiance.broadcast_failed',
  UNSUPPORTED_DRIVER: 'radiance.unsupported_driver',
  CONNECTION_ERROR: 'radiance.connection_error',
  INVALID_CONFIG: 'radiance.invalid_config',
} as const

export type RadianceErrorCode = (typeof RadianceErrorCodes)[keyof typeof RadianceErrorCodes]
