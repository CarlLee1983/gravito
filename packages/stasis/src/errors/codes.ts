/**
 * Error codes for the stasis package.
 * @public
 */
export const StasisErrorCodes = {
  EMPTY_CACHE_KEY: 'stasis.empty_cache_key',
  STORE_NOT_FOUND: 'stasis.store_not_found',
  STORE_MISSING_PROVIDER: 'stasis.store_missing_provider',
  UNSUPPORTED_DRIVER: 'stasis.unsupported_driver',
  ORBIT_NOT_INSTALLED: 'stasis.orbit_not_installed',
  TAGS_NOT_SUPPORTED: 'stasis.tags_not_supported',
  LOCK_ABORTED: 'stasis.lock_aborted',
} as const

export type StasisErrorCode = (typeof StasisErrorCodes)[keyof typeof StasisErrorCodes]
