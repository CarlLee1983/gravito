import type { ContentfulStatusCode, GravitoContext } from '../http/types'
/**
 * Standard API Success Response Structure
 * @public
 */
export type ApiSuccess<T> = {
  success: true
  data: T
}
/**
 * Standard API Failure Response Structure
 * @public
 */
export type ApiFailure = {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}
/**
 * Create a success response object.
 * @public
 */
export declare function ok<T>(data: T): ApiSuccess<T>
/**
 * Create a failure response object.
 * @public
 */
export declare function fail(message: string, code?: string, details?: unknown): ApiFailure
/**
 * Return a JSON response with standard success structure.
 * @public
 */
export declare function jsonSuccess<T>(
  c: GravitoContext,
  data: T,
  status?: ContentfulStatusCode
): Response
/**
 * Return a JSON response with standard failure structure.
 * @public
 */
export declare function jsonFail(
  c: GravitoContext,
  message: string,
  status?: ContentfulStatusCode,
  code?: string,
  details?: unknown
): Response
