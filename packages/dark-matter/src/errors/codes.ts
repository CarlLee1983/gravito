/**
 * Error codes for the dark-matter package.
 * @public
 */
export const DarkMatterErrorCodes = {
  CONNECTION_FAILED: 'dark_matter.connection_failed',
  NOT_CONNECTED: 'dark_matter.not_connected',
  CONNECTION_NOT_CONFIGURED: 'dark_matter.connection_not_configured',
  GRIDFS_NOT_INITIALIZED: 'dark_matter.gridfs_not_initialized',
  OPERATION_FAILED: 'dark_matter.operation_failed',
} as const

export type DarkMatterErrorCode =
  (typeof DarkMatterErrorCodes)[keyof typeof DarkMatterErrorCodes]
