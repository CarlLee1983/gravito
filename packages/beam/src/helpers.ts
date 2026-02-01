import type { Env, Photon, Schema } from '@gravito/photon'
import { BeamError } from './errors'
import { createBeam } from './index'
import type { BeamOptions } from './types'

/**
 * Create a Beam client with authentication
 *
 * A convenience function for creating a client that automatically attaches a Bearer token.
 * The token can be a static string or a dynamic function, supporting token refresh on each request.
 *
 * @template T - Photon application type
 * @param baseUrl - Base URL of the API server
 * @param getToken - Function to retrieve the token (supports sync or async)
 * @param options - Other Beam configuration options (excluding headers)
 * @returns An authenticated Beam client
 *
 * @example
 * ```typescript
 * // Static token
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   () => 'my-static-token'
 * )
 *
 * // Dynamic token (read from localStorage)
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   () => localStorage.getItem('authToken') || ''
 * )
 *
 * // Async token (refreshed via API)
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   async () => {
 *     const token = await refreshToken()
 *     return token
 *   },
 *   { timeout: 5000 }
 * )
 * ```
 *
 * @public
 */
export function createAuthenticatedBeam<T extends Photon<Env, Schema, string>>(
  baseUrl: string,
  getToken: () => string | Promise<string>,
  options?: Omit<BeamOptions, 'headers'>
): ReturnType<typeof createBeam<T>> {
  return createBeam<T>(baseUrl, {
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await getToken()}`,
    }),
  })
}

/**
 * Parse response and extract JSON data, throwing an error on failure
 *
 * A convenience function for automatically checking the response status and parsing JSON.
 * Throws a BeamError if the response status is not 2xx.
 *
 * @template T - Expected response data type
 * @param response - Fetch Response object
 * @returns Parsed JSON data
 * @throws {BeamError} When the response status is not 2xx
 *
 * @example
 * ```typescript
 * const res = await client.users.$get()
 * const data = await unwrapResponse<User[]>(res)
 * // Automatically throws BeamError if the request fails
 * ```
 *
 * @public
 */
export async function unwrapResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new BeamError(`Request failed with status ${response.status}`, response.status)
  }

  // Handle empty response (e.g., 204 No Content)
  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text)
}

/**
 * Safely parse response without throwing errors
 *
 * Provides a Rust/Go style error handling pattern, returning an object containing either data or error.
 * Does not throw errors, suitable for scenarios where explicit error handling is required.
 *
 * @template T - Expected response data type
 * @param response - Fetch Response object
 * @returns Object containing either data or error
 *
 * @example
 * ```typescript
 * const res = await client.users.$get()
 * const { data, error } = await safeResponse<User[]>(res)
 *
 * if (error) {
 *   console.error('Request failed:', error.message)
 *   return
 * }
 *
 * console.log('Users:', data)
 * ```
 *
 * @public
 */
export async function safeResponse<T>(
  response: Response
): Promise<{ data: T; error: null } | { data: null; error: BeamError }> {
  try {
    if (!response.ok) {
      return {
        data: null,
        error: new BeamError(`Request failed with status ${response.status}`, response.status),
      }
    }

    // Handle empty response (e.g., 204 No Content)
    const text = await response.text()
    if (!text) {
      return { data: undefined as T, error: null }
    }

    return { data: JSON.parse(text), error: null }
  } catch (e) {
    return {
      data: null,
      error: new BeamError('Parse error', undefined, 'PARSE_ERROR', e),
    }
  }
}

/**
 * Creates a cached header resolver to prevent redundant expensive operations
 *
 * This is useful for headers like authentication tokens that involve
 * complex logic or I/O and don't need to be refreshed on every request.
 *
 * @param resolver - The async function that retrieves headers
 * @param ttl - Cache survival time in milliseconds (default: 60,000 / 1 min)
 * @returns A cached header resolver function
 *
 * @example
 * ```typescript
 * const client = createBeam<AppType>('/api', {
 *   headers: createCachedHeaderResolver(async () => {
 *     const token = await fetchAuthToken()
 *     return { Authorization: `Bearer ${token}` }
 *   }, 5 * 60 * 1000) // cache for 5 minutes
 * })
 * ```
 *
 * @public
 */
export function createCachedHeaderResolver(
  resolver: () => Record<string, string> | Promise<Record<string, string>>,
  ttl = 60000
): () => Promise<Record<string, string>> {
  let cache: Record<string, string> | null = null
  let expiry = 0

  return async () => {
    const now = Date.now()
    if (!cache || now > expiry) {
      cache = await resolver()
      expiry = now + ttl
    }
    return cache
  }
}

/**
 * Validate a response body against a schema
 *
 * Provides runtime validation for response data to ensure it matches the expected type.
 * Supports Zod-like schema objects with a `parse` or `validate` method, or a simple validator function.
 *
 * @template T - Expected output type
 * @param response - Fetch Response object
 * @param schema - Validation schema or function
 * @returns Validated data
 * @throws {BeamError} When validation fails or response is not 2xx
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const UserSchema = z.object({ id: z.number(), name: z.string() })
 *
 * const res = await client.users.$get()
 * const data = await validateResponse(res, UserSchema)
 * ```
 *
 * @public
 */
export async function validateResponse<T>(
  response: Response,
  schema:
    | { parse: (data: unknown) => T }
    | { validate: (data: unknown) => T }
    | ((data: unknown) => T)
): Promise<T> {
  const data = await unwrapResponse<unknown>(response)

  try {
    if (typeof schema === 'function') {
      return schema(data)
    }
    if ('parse' in schema) {
      return schema.parse(data)
    }
    if ('validate' in schema) {
      return schema.validate(data)
    }
    return data as T
  } catch (e) {
    throw new BeamError('Validation failed', response.status, 'VALIDATION_ERROR', e)
  }
}
