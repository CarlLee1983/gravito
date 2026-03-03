import type { ContentfulStatusCode } from '../http/types'
/**
 * Options for creating a GravitoException
 * @public
 */
export interface ExceptionOptions {
  message?: string
  cause?: unknown
  i18nKey?: string
  i18nParams?: Record<string, string | number>
}
/**
 * Base exception class for consistent error handling.
 * @public
 */
export declare abstract class GravitoException extends Error {
  readonly status: ContentfulStatusCode
  readonly code: string
  readonly i18nKey?: string
  readonly i18nParams?: Record<string, string | number>
  constructor(status: number, code: string, options?: ExceptionOptions)
  getLocalizedMessage(t: (key: string, params?: Record<string, string | number>) => string): string
}
