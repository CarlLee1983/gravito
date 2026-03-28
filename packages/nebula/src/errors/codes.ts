/**
 * Error codes for the nebula package.
 * @public
 */
export const NebulaErrorCodes = {
  OPERATION_NOT_SUPPORTED: 'nebula.operation_not_supported',
  FILE_NOT_FOUND: 'nebula.file_not_found',
  WRITE_STREAM_FAILED: 'nebula.write_stream_failed',
  INVALID_STORAGE_KEY: 'nebula.invalid_storage_key',
  MANAGER_NOT_INITIALIZED: 'nebula.manager_not_initialized',
  DRIVER_NOT_CONFIGURED: 'nebula.driver_not_configured',
  COPY_SOURCE_NOT_FOUND: 'nebula.copy_source_not_found',
} as const

export type NebulaErrorCode = (typeof NebulaErrorCodes)[keyof typeof NebulaErrorCodes]
