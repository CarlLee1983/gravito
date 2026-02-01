import { BeamNetworkError, BeamTimeoutError } from './errors'
import type { RetryOptions } from './types'

/**
 * Default HTTP status codes that should be retried
 */
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Creates a fetch function with timeout support
 *
 * @param timeout - Timeout duration in milliseconds
 * @returns A fetch function with timeout capability
 */
export function createFetchWithTimeout(
  timeout: number
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BeamTimeoutError(timeout)
      }
      throw new BeamNetworkError('Network request failed', error)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Executes a request with retry logic
 *
 * @param fetchFn - Function to execute the request
 * @param options - Retry configuration options
 * @returns The request response
 */
export async function executeWithRetry(
  fetchFn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    count = 0,
    delay = 1000,
    statusCodes = DEFAULT_RETRY_STATUS_CODES,
    backoff = 2,
    jitter = true,
  } = options

  let lastError: Error | undefined
  let attempts = 0

  while (attempts <= count) {
    try {
      const response = await fetchFn()

      // If status code does not require retry or max attempts reached, return directly
      if (!statusCodes.includes(response.status) || attempts === count) {
        return response
      }

      // Need retry - consume response body to release connection
      await response.text().catch(() => {
        // Ignore consumption errors
      })
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If max retry count reached, throw error
      if (attempts === count) {
        throw lastError
      }
    }

    attempts++
    if (attempts <= count) {
      // Calculate delay duration (exponential backoff)
      let waitTime = delay * backoff ** (attempts - 1)

      // Apply jitter if enabled (randomized ±20% range)
      if (jitter) {
        const jitterFactor = 0.2
        const min = waitTime * (1 - jitterFactor)
        const max = waitTime * (1 + jitterFactor)
        waitTime = Math.floor(Math.random() * (max - min + 1) + min)
      }

      await sleep(waitTime)
    }
  }

  // Theoretically should not reach here, but for type safety
  throw lastError || new Error('Request failed')
}

/**
 * Delay for a specified duration
 *
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Resolves headers (supports static object or dynamic function)
 *
 * @param headers - Headers configuration
 * @returns Resolved headers object
 */
export async function resolveHeaders(
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
): Promise<Record<string, string> | undefined> {
  if (!headers) {
    return undefined
  }
  if (typeof headers === 'function') {
    return await headers()
  }
  return headers
}
