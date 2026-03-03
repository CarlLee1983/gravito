import { GravitoException } from './GravitoException'
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
export declare class ValidationException extends GravitoException {
  readonly errors: ValidationError[]
  redirectTo?: string
  input?: unknown
  constructor(errors: ValidationError[], message?: string)
  withRedirect(url: string): this
  withInput(input: unknown): this
}
