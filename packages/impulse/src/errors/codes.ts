/**
 * @fileoverview Impulse error codes
 *
 * Namespaced error codes for the Impulse validation module.
 *
 * @module @gravito/impulse/errors
 */

/**
 * Error codes for Impulse module operations.
 * Follows dot-separated namespace convention.
 */
export const ImpulseErrorCodes = {
  UNSUPPORTED_SCHEMA: 'impulse.unsupported_schema',
  INVALID_SCHEMA: 'impulse.invalid_schema',
  VALIDATION_FAILED: 'impulse.validation_failed',
} as const

export type ImpulseErrorCode = (typeof ImpulseErrorCodes)[keyof typeof ImpulseErrorCodes]
