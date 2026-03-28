/**
 * @fileoverview Quark error codes
 *
 * Namespaced error codes for the Quark TCP module.
 *
 * @module @gravito/quark/errors
 */

/**
 * Error codes for Quark module operations.
 * Follows dot-separated namespace convention.
 */
export const QuarkErrorCodes = {
  INVALID_STATE: 'quark.invalid_state',
  ALREADY_LISTENING: 'quark.already_listening',
  INVALID_CONFIG: 'quark.invalid_config',
  INVALID_FRAME: 'quark.invalid_frame',
  FRAME_TOO_LARGE: 'quark.frame_too_large',
} as const

export type QuarkErrorCode = (typeof QuarkErrorCodes)[keyof typeof QuarkErrorCodes]
