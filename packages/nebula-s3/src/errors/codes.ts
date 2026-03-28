/**
 * Error codes for the nebula-s3 package.
 * @public
 */
export const NebulaS3ErrorCodes = {
  COPY_SOURCE_NOT_FOUND: 'nebula_s3.copy_source_not_found',
  FILE_NOT_FOUND: 'nebula_s3.file_not_found',
  WRITE_STREAM_FAILED: 'nebula_s3.write_stream_failed',
  LIST_FAILED: 'nebula_s3.list_failed',
} as const

export type NebulaS3ErrorCode = (typeof NebulaS3ErrorCodes)[keyof typeof NebulaS3ErrorCodes]
