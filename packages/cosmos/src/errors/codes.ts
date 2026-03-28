/**
 * Structured error codes for @gravito/cosmos i18n operations.
 * Follows the dot-separated namespace convention used across Gravito.
 *
 * @public
 */
export const CosmosErrorCodes = {
  // Translation errors
  MISSING_TRANSLATION: 'cosmos.missing_translation',

  // Loader errors
  LOADER_FAILED: 'cosmos.loader_failed',
  UNSUPPORTED_FORMAT: 'cosmos.unsupported_format',

  // Filesystem loader errors
  FILE_NOT_FOUND: 'cosmos.file_not_found',
  FILE_READ_FAILED: 'cosmos.file_read_failed',

  // Remote loader errors
  HTTP_ERROR: 'cosmos.http_error',

  // Runtime errors
  EDGE_RUNTIME_UNSUPPORTED: 'cosmos.edge_runtime_unsupported',

  // KV storage errors
  KV_PUT_UNSUPPORTED: 'cosmos.kv_put_unsupported',
  KV_DELETE_UNSUPPORTED: 'cosmos.kv_delete_unsupported',
} as const

export type CosmosErrorCode = (typeof CosmosErrorCodes)[keyof typeof CosmosErrorCodes]
