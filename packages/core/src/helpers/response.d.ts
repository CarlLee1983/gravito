import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
export type ApiSuccess<T> = {
  success: true
  data: T
}
export type ApiFailure = {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}
export declare function ok<T>(data: T): ApiSuccess<T>
export declare function fail(message: string, code?: string, details?: unknown): ApiFailure
export declare function jsonSuccess<T>(c: Context, data: T, status?: ContentfulStatusCode): Response
export declare function jsonFail(
  c: Context,
  message: string,
  status?: ContentfulStatusCode,
  code?: string,
  details?: unknown
): Response
//# sourceMappingURL=response.d.ts.map
