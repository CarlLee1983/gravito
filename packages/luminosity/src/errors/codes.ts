export const LuminosityErrorCodes = {
  // Storage/network errors (retryable)
  STORAGE_READ_FAILED: 'luminosity.storage.read_failed',
  STORAGE_SNAPSHOT_NOT_FOUND: 'luminosity.storage.snapshot_not_found',
  STORAGE_FILE_NOT_FOUND: 'luminosity.storage.file_not_found',
  // Submit/network errors (retryable)
  SUBMIT_RATE_LIMIT_MISSING: 'luminosity.storage.rate_limit_missing',
  SUBMIT_REQUEST_FAILED: 'luminosity.storage.request_failed',
  SUBMIT_TOKEN_FAILED: 'luminosity.storage.token_failed',
  SUBMIT_TOKEN_MISSING: 'luminosity.storage.token_missing',
  SUBMIT_CREDENTIALS_NOT_INIT: 'luminosity.storage.credentials_not_init',
  // Config/validation errors (not retryable)
  CONFIG_INVALID: 'luminosity.config.invalid',
  CONFIG_MISSING_MODE: 'luminosity.config.missing_mode',
  CONFIG_MISSING_BASE_URL: 'luminosity.config.missing_base_url',
  CONFIG_MISSING_RESOLVERS: 'luminosity.config.missing_resolvers',
  CONFIG_MISSING_INCREMENTAL: 'luminosity.config.missing_incremental',
  CONFIG_CREDENTIALS_MISSING: 'luminosity.config.credentials_missing',
  // SEO/render errors (not retryable)
  SEO_UNKNOWN_MODE: 'luminosity.seo.unknown_mode',
  SEO_FETCH_FAILED: 'luminosity.seo.fetch_failed',
  SEO_INSPECTION_FAILED: 'luminosity.seo.inspection_failed',
} as const

export type LuminosityErrorCode = (typeof LuminosityErrorCodes)[keyof typeof LuminosityErrorCodes]
