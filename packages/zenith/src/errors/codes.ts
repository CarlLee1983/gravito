export const ZenithErrorCodes = {
  ALERT_SEND_FAILED: 'zenith.alert_send_failed',
  WORKER_NOT_FOUND: 'zenith.worker_not_found',
  CONTEXT_MISSING: 'zenith.context_missing',
  CONFIG_ERROR: 'zenith.config_error',
} as const

export type ZenithErrorCode = (typeof ZenithErrorCodes)[keyof typeof ZenithErrorCodes]
