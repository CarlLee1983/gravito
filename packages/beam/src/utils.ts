import { BeamNetworkError, BeamTimeoutError } from './errors'
import type { RetryOptions } from './types'

/**
 * Default HTTP status codes that should be retried
 */
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Merges multiple AbortSignals into a single signal
 * When any of the input signals aborts, the merged signal will also abort
 *
 * @param signals - Array of AbortSignals to merge
 * @returns A merged AbortSignal
 */
export function mergeAbortSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  const validSignals = signals.filter((s): s is AbortSignal => s !== undefined)

  // If no signals, return a signal that never aborts
  if (validSignals.length === 0) {
    return new AbortController().signal
  }

  // If only one signal, return it directly
  if (validSignals.length === 1) {
    return validSignals[0]
  }

  // Create a new controller to merge multiple signals
  const controller = new AbortController()

  // Listen to all signals and abort when any of them aborts
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return controller.signal
}

/**
 * Creates a fetch function with timeout support
 *
 * @param timeout - Timeout duration in milliseconds
 * @param userSignal - Optional user-provided AbortSignal
 * @returns A fetch function with timeout capability
 */
export function createFetchWithTimeout(
  timeout: number,
  userSignal?: AbortSignal
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    try {
      // Merge timeout signal with user signal and init signal
      const mergedSignal = mergeAbortSignals([
        timeoutController.signal,
        userSignal,
        init?.signal as AbortSignal | undefined,
      ])

      const response = await fetch(input, {
        ...init,
        signal: mergedSignal,
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if it was a timeout or user cancellation
        if (
          timeoutController.signal.aborted &&
          !userSignal?.aborted &&
          !(init?.signal as AbortSignal)?.aborted
        ) {
          throw new BeamTimeoutError(timeout)
        }
        // Re-throw as network error for user-initiated cancellation
        throw new BeamNetworkError('Request aborted', error)
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
