import { HTTPException } from 'hono/http-exception'
export interface ExceptionOptions {
  message?: string
  cause?: unknown
  i18nKey?: string
  i18nParams?: Record<string, string | number>
}
export declare abstract class GravitoException extends HTTPException {
  readonly code: string
  readonly i18nKey?: string
  readonly i18nParams?: Record<string, string | number>
  constructor(status: number, code: string, options?: ExceptionOptions)
  getLocalizedMessage(t: (key: string, params?: Record<string, string | number>) => string): string
}
//# sourceMappingURL=GravitoException.d.ts.map
