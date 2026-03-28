export const MonitorErrorCodes = {
  SDK_NOT_INITIALIZED: 'monitor.sdk_not_initialized',
  CHECK_FAILED: 'monitor.check_failed',
} as const

export type MonitorErrorCode = (typeof MonitorErrorCodes)[keyof typeof MonitorErrorCodes]
