import type { GravitoContext, ContentfulStatusCode } from '../http/types'

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

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data }
}

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

export function jsonSuccess<T>(c: GravitoContext, data: T, status: ContentfulStatusCode = 200): Response {
  return c.json(ok(data), status)
}

export function jsonFail(
  c: GravitoContext,
  message: string,
  status: ContentfulStatusCode = 400,
  code?: string,
  details?: unknown
): Response {
  return c.json(fail(message, code, details), status)
}
