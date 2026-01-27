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
export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data }
}

/**
 * Create a failure response object.
 * @public
 */
export function fail(message: string, code?: string, details?: unknown): ApiFailure {
  const error: ApiFailure['error'] = { message }
  if (code !== undefined) {
    error.code = code
  }
  if (details !== undefined) {
    error.details = details
  }
  return { success: false, error }
}

/**
 * Return a JSON response with standard success structure.
 * @public
 */
export function jsonSuccess<T>(
  c: GravitoContext,
  data: T,
  status: ContentfulStatusCode = 200
): Response {
  return c.json(ok(data), status)
}

/**
 * Return a JSON response with standard failure structure.
 * @public
 */
export function jsonFail(
  c: GravitoContext,
  message: string,
  status: ContentfulStatusCode = 400,
  code?: string,
  details?: unknown
): Response {
  return c.json(fail(message, code, details), status)
}
