import { DomainException } from './DomainException'

/**
 * Structure of a validation error
 * @public
 */
export interface ValidationError {
  field: string
  message: string
  code?: string
}

/**
 * Exception thrown when data validation fails.
 * @public
 */
export class ValidationException extends DomainException {
  public readonly errors: ValidationError[]
  public redirectTo?: string
  public input?: unknown

  constructor(errors: ValidationError[], message = 'Validation failed') {
    super(422, 'VALIDATION_ERROR', {
      message,
      i18nKey: 'errors.validation.failed',
    })
    this.name = 'ValidationException'
    this.errors = errors
  }

  withRedirect(url: string): this {
    this.redirectTo = url
    return this
  }

  withInput(input: unknown): this {
    this.input = input
    return this
  }
}
