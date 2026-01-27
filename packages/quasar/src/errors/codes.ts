export const ErrorCodes = {
  REDIS_CONNECTION_FAILED: 'QUASAR_ERR_001',
  PROBE_COLLECTION_FAILED: 'QUASAR_ERR_002',
  BRIDGE_ATTACH_FAILED: 'QUASAR_ERR_003',
  COMMAND_EXECUTION_FAILED: 'QUASAR_ERR_004',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
