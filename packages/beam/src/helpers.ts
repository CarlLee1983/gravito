import type { Hono } from 'hono'
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
export function createAuthenticatedBeam<T extends Hono<any, any, any>>(
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

/**
 * 偵測當前執行環境是否支援 Bun 原生 JSONL 批量解析（SIMD 加速）
 *
 * Bun v1.2+ 提供 `Bun.JSONL` 全域物件，可利用 SIMD 指令集加速 JSONL 批量解析，
 * 效能比逐行 JSON.parse() 高出數倍。
 *
 * @returns 是否具備 Bun 原生 JSONL 能力
 */
function hasBunJsonl(): boolean {
  return (
    typeof globalThis.Bun !== 'undefined' &&
    typeof (globalThis.Bun as Record<string, unknown>).JSONL === 'object'
  )
}

/**
 * 流式消費 NDJSON 回應（Content-Type: application/x-ndjson）
 *
 * 使用 ReadableStream reader 逐次讀取回應 body，透過 TextDecoder 解碼 UTF-8，
 * 並逐行解析 JSON，以 AsyncGenerator 方式產出每筆記錄。
 * 適合處理大型串流或 SSE-like 的 NDJSON 端點，避免一次性將所有資料載入記憶體。
 *
 * @template T - 每筆 NDJSON 記錄的型別
 * @param response - Fetch Response 物件（應為 NDJSON 格式的流式回應）
 * @yields 每次產出一筆已解析的 JSON 記錄
 * @throws {BeamError} 當回應狀態碼非 2xx 時拋出
 *
 * @example
 * ```typescript
 * const res = await client.events.$get()
 * for await (const event of consumeJsonLines<Event>(res)) {
 *   console.log('Received:', event)
 * }
 * ```
 *
 * @public
 */
export async function* consumeJsonLines<T>(response: Response): AsyncGenerator<T> {
  if (!response.ok) {
    throw new BeamError(`Request failed with status ${response.status}`, response.status)
  }

  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  // stream:true 允許 TextDecoder 跨 chunk 正確處理多位元組字元
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // 處理最後殘餘 buffer（可能為未含換行符的最後一行）
        const remaining = buffer.trim()
        if (remaining.length > 0) {
          try {
            yield JSON.parse(remaining) as T
          } catch (e) {
            throw new BeamError('Failed to parse NDJSON line', undefined, 'PARSE_ERROR', e)
          }
        }
        break
      }

      // stream:true 確保 TextDecoder 保留跨 chunk 的多位元組字元狀態
      buffer += decoder.decode(value, { stream: true })

      // 逐行切割並解析（保留最後不完整的行至下一個 chunk）
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          continue
        }
        try {
          yield JSON.parse(trimmed) as T
        } catch (e) {
          throw new BeamError('Failed to parse NDJSON line', undefined, 'PARSE_ERROR', e)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 收集所有 NDJSON 記錄為陣列
 *
 * 一次性讀取完整回應文本，若執行環境支援 `Bun.JSONL.parse()`（SIMD 加速），
 * 則使用原生解析器；否則降級為逐行 `JSON.parse()`。
 * 空回應返回空陣列。
 *
 * @template T - 每筆 NDJSON 記錄的型別
 * @param response - Fetch Response 物件（應為 NDJSON 格式的回應）
 * @returns 所有已解析記錄的陣列
 * @throws {BeamError} 當回應狀態碼非 2xx 或 JSON 解析失敗時拋出
 *
 * @example
 * ```typescript
 * const res = await client.products.$get()
 * const products = await collectJsonLines<Product>(res)
 * console.log('Total products:', products.length)
 * ```
 *
 * @public
 */
export async function collectJsonLines<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new BeamError(`Request failed with status ${response.status}`, response.status)
  }

  const text = await response.text()
  if (!text.trim()) {
    return []
  }

  if (hasBunJsonl()) {
    // Bun 原生 JSONL 批量解析（SIMD 加速）
    const bunJsonl = (globalThis.Bun as Record<string, unknown>).JSONL as {
      parse: (text: string | Uint8Array) => unknown[]
    }
    return bunJsonl.parse(text) as T[]
  }

  // 降級：逐行解析，忽略空行
  const results: T[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      continue
    }
    try {
      results.push(JSON.parse(trimmed) as T)
    } catch (e) {
      throw new BeamError('Failed to parse NDJSON line', undefined, 'PARSE_ERROR', e)
    }
  }
  return results
}
