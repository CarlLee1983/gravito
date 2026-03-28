/**
 * Error codes for the forge package.
 * @public
 */
export const ForgeErrorCodes = {
  UNSUPPORTED_MIME_TYPE: 'forge.unsupported_mime_type',
  MISSING_OUTPUT_PATH: 'forge.missing_output_path',
  MISSING_INPUT_PATH: 'forge.missing_input_path',
  STATUS_STORE_REQUIRED: 'forge.status_store_required',
  SERVICE_REQUIRED: 'forge.service_required',
  JOB_NOT_FOUND: 'forge.job_not_found',
  OUTPUT_READ_FAILED: 'forge.output_read_failed',
  DISK_SPACE_INSUFFICIENT: 'forge.disk_space_insufficient',
  UNEXPECTED_OUTPUT_TYPE: 'forge.unexpected_output_type',
} as const

export type ForgeErrorCode = (typeof ForgeErrorCodes)[keyof typeof ForgeErrorCodes]
