/**
 * Error codes for the constellation package.
 * @public
 */
export const ConstellationErrorCodes = {
  INVALID_FILENAME: 'constellation.invalid_filename',
  STORAGE_READ_FAILED: 'constellation.storage_read_failed',
  STORAGE_WRITE_FAILED: 'constellation.storage_write_failed',
  STORAGE_DELETE_FAILED: 'constellation.storage_delete_failed',
  STORAGE_LIST_FAILED: 'constellation.storage_list_failed',
  VERSION_UNAVAILABLE: 'constellation.version_unavailable',
  VERSION_NOT_FOUND: 'constellation.version_not_found',
  STATIC_MODE_REQUIRED: 'constellation.static_mode_required',
  INCREMENTAL_NOT_CONFIGURED: 'constellation.incremental_not_configured',
  INVALID_COMPRESSION_LEVEL: 'constellation.invalid_compression_level',
  INVALID_DATABASE_IDENTIFIER: 'constellation.invalid_database_identifier',
  LOCK_ACQUIRE_FAILED: 'constellation.lock_acquire_failed',
} as const

export type ConstellationErrorCode =
  (typeof ConstellationErrorCodes)[keyof typeof ConstellationErrorCodes]
