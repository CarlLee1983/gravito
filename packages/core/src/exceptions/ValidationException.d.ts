import { GravitoException } from './GravitoException'
export interface ValidationError {
  field: string
  message: string
  code?: string
}
export declare class ValidationException extends GravitoException {
  readonly errors: ValidationError[]
  redirectTo?: string
  input?: unknown
  constructor(errors: ValidationError[], message?: string)
  withRedirect(url: string): this
  withInput(input: unknown): this
}
//# sourceMappingURL=ValidationException.d.ts.map
