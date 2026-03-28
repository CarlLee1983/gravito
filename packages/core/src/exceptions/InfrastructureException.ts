import { type ExceptionOptions, GravitoException } from './GravitoException'

/**
 * Options for creating an InfrastructureException
 * @public
 */
export interface InfrastructureExceptionOptions extends ExceptionOptions {
  retryable?: boolean
}

/**
 * Abstract base class for infrastructure / I/O errors (database, network, filesystem, etc.).
 * Carries a `retryable` flag that callers can inspect to decide whether the operation should be retried.
 * @public
 */
export abstract class InfrastructureException extends GravitoException {
  public readonly retryable: boolean

  constructor(
    status: number,
    code: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'InfrastructureException'
    this.retryable = options.retryable ?? false
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
