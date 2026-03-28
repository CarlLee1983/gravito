/**
 * Error codes for the pulsar package.
 * @public
 */
export const PulsarErrorCodes = {
  INVALID_SESSION_ID: 'pulsar.invalid_session_id',
  DATABASE_NOT_INITIALIZED: 'pulsar.database_not_initialized',
} as const

export type PulsarErrorCode = (typeof PulsarErrorCodes)[keyof typeof PulsarErrorCodes]
