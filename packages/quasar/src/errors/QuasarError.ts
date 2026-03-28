import { QueueException, type InfrastructureExceptionOptions } from '@gravito/core'

export const QuasarErrorCodes = {
  PIPELINE_FAILED: 'quasar.pipeline_failed',
  PIPELINE_INCOMPLETE: 'quasar.pipeline_incomplete',
  API_ERROR: 'quasar.api_error',
  CONNECTION_FAILED: 'quasar.connection_failed',
  NOT_FOUND: 'quasar.not_found',
  TIMEOUT: 'quasar.timeout',
  INVALID_CONFIG: 'quasar.invalid_config',
  UNKNOWN: 'quasar.unknown',
} as const

export type QuasarErrorCode = (typeof QuasarErrorCodes)[keyof typeof QuasarErrorCodes]

export class QuasarError extends QueueException {
  constructor(
    code: string,
    message: string,
    cause?: unknown,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message: `[${code}] ${message}`, cause, ...options })
    this.name = 'QuasarError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
