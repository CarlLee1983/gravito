export const HorizonErrorCodes = {
  // Scheduling errors
  CRON_PARSE_ERROR: 'horizon.cron_parse_error',
  SCHEDULE_FAILED: 'horizon.schedule_failed',
  COMMAND_FAILED: 'horizon.command_failed',
  // Validation errors
  INVALID_TIME_FORMAT: 'horizon.invalid_time_format',
  INVALID_MINUTE: 'horizon.invalid_minute',
  INVALID_DAY_OF_WEEK: 'horizon.invalid_day_of_week',
  INVALID_DAY_OF_MONTH: 'horizon.invalid_day_of_month',
  INVALID_TIMEOUT: 'horizon.invalid_timeout',
  INVALID_RETRY_ATTEMPTS: 'horizon.invalid_retry_attempts',
  INVALID_RETRY_DELAY: 'horizon.invalid_retry_delay',
  INVALID_TIMEZONE: 'horizon.invalid_timezone',
  // Lock errors
  LOCK_DRIVER_REQUIRED: 'horizon.lock_driver_required',
} as const

export type HorizonErrorCode = (typeof HorizonErrorCodes)[keyof typeof HorizonErrorCodes]
