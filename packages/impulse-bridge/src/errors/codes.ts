/**
 * @fileoverview ImpulseBridge error codes
 *
 * Namespaced error codes for the ImpulseBridge module.
 * Note: impulse-bridge has no bare throws, but error codes are provided
 * for documentation consistency and future use.
 *
 * @module @gravito/impulse-bridge/errors
 */

/**
 * Error codes for ImpulseBridge module operations.
 * Follows dot-separated namespace convention.
 */
export const ImpulseBridgeErrorCodes = {
  BRIDGE_ERROR: 'impulse-bridge.bridge_error',
  INVALID_CONFIG: 'impulse-bridge.invalid_config',
} as const

export type ImpulseBridgeErrorCode =
  (typeof ImpulseBridgeErrorCodes)[keyof typeof ImpulseBridgeErrorCodes]
