/**
 * Structured error codes for @gravito/sentinel authentication operations.
 * Follows the dot-separated namespace convention used across Gravito.
 *
 * @public
 */
export const SentinelErrorCodes = {
  // Guard configuration errors
  GUARD_NOT_DEFINED: 'sentinel.guard_not_defined',
  GUARD_DRIVER_UNSUPPORTED: 'sentinel.guard_driver_unsupported',
  GUARD_CREATOR_NOT_FOUND: 'sentinel.guard_creator_not_found',

  // Provider errors
  PROVIDER_NOT_DEFINED: 'sentinel.provider_not_defined',
  PROVIDER_NOT_FOUND: 'sentinel.provider_not_found',
  PROVIDER_DRIVER_UNSUPPORTED: 'sentinel.provider_driver_unsupported',

  // Session errors
  SESSION_REPO_NOT_CONFIGURED: 'sentinel.session_repo_not_configured',
  INVALID_PASSWORD: 'sentinel.invalid_password',
} as const

export type SentinelErrorCode = (typeof SentinelErrorCodes)[keyof typeof SentinelErrorCodes]
