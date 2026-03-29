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
    timeoutId.unref?.()

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
  if (typeof Bun !== 'undefined') return Bun.sleep(ms)
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

/**
 * Request deduplicator for preventing redundant GET requests
 *
 * This class maintains a cache of in-flight requests and ensures that
 * identical GET requests share the same underlying fetch promise.
 */
export class RequestDeduplicator {
  private cache = new Map<string, Promise<Response>>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private window: number

  constructor(window = 1000) {
    this.window = window
  }

  /**
   * Generates a unique cache key for a request
   *
   * @param input - Request URL or Request object
   * @param init - Request initialization options
   * @returns A unique cache key
   */
  private generateKey(input: RequestInfo | URL, init?: RequestInit): string {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method?.toUpperCase() || 'GET'

    // Only deduplicate GET requests
    if (method !== 'GET') {
      return `${Math.random()}` // Force unique key for non-GET requests
    }

    // Include relevant headers in the key (exclude auth headers that might change)
    const relevantHeaders: Record<string, string> = {}
    if (init?.headers) {
      const headers = new Headers(init.headers)
      // Only include headers that affect the response content
      const includedHeaders = ['accept', 'accept-language', 'content-type']
      for (const key of includedHeaders) {
        const value = headers.get(key)
        if (value) {
          relevantHeaders[key] = value
        }
      }
    }

    return `${method}::${url}::${JSON.stringify(relevantHeaders)}`
  }

  /**
   * Clears a cache entry and its associated timeout
   *
   * @param key - Cache key to clear
   */
  private clearEntry(key: string): void {
    this.cache.delete(key)
    const timeout = this.timeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(key)
    }
  }

  /**
   * Fetches a resource with deduplication
   *
   * @param fetchFn - The fetch function to use
   * @param input - Request URL or Request object
   * @param init - Request initialization options
   * @returns A promise that resolves to the response
   */
  async fetch(
    fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const key = this.generateKey(input, init)

    // If there's an in-flight request, return a clone of its response
    if (this.cache.has(key)) {
      const cachedPromise = this.cache.get(key)!
      return cachedPromise.then((res) => res.clone())
    }

    // Create new request promise
    const promise = fetchFn(input, init)
      .then((res) => {
        // Clear cache entry immediately after completion
        this.clearEntry(key)
        return res
      })
      .catch((error) => {
        // Clear cache entry on error
        this.clearEntry(key)
        throw error
      })

    // Store in cache
    this.cache.set(key, promise)

    // Set timeout to clear cache entry if it takes too long
    const timeout = setTimeout(() => {
      this.clearEntry(key)
    }, this.window)
    timeout.unref?.()
    this.timeouts.set(key, timeout)

    return promise.then((res) => res.clone())
  }

  /**
   * Clears all cached requests
   */
  clear(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout)
    }
    this.cache.clear()
    this.timeouts.clear()
  }

  /**
   * Gets the current cache size
   */
  get size(): number {
    return this.cache.size
  }
}

/**
 * Queued request object
 */
export interface QueuedRequest {
  id: string
  input: string
  init: RequestInit
  timestamp: number
}

/**
 * Offline queue manager for persistence and re-sending requests
 */
export class OfflineQueue {
  private queue: QueuedRequest[] = []
  private options: Required<import('./types').OfflineQueueOptions>

  constructor(options: import('./types').OfflineQueueOptions = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      storage: options.storage ?? 'memory',
      maxSize: options.maxSize ?? 100,
      retryOnReconnect: options.retryOnReconnect ?? true,
    }

    if (this.options.storage === 'localStorage' && typeof window !== 'undefined') {
      this.loadFromStorage()
    }

    if (this.options.retryOnReconnect && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.drain().catch(() => {})
      })
    }
  }

  /**
   * Gets the current queue size
   */
  get size(): number {
    return this.queue.length
  }

  /**
   * Adds a request to the offline queue
   */
  async add(
    _fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<void> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    const request: QueuedRequest = {
      id: Math.random().toString(36).substring(7),
      input: url,
      init: init || {},
      timestamp: Date.now(),
    }

    if (this.queue.length >= this.options.maxSize) {
      this.queue.shift() // FIFO eviction
    }

    this.queue.push(request)
    this.persist()
  }

  /**
   * Drains the queue by re-sending all requests
   *
   * @param fetchFn - Optional fetch function to use for re-sending (defaults to global fetch)
   */
  async drain(
    fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch.bind(
      globalThis
    )
  ): Promise<void> {
    const currentQueue = [...this.queue]
    this.queue = []

    const remainingRequests: QueuedRequest[] = []

    for (const req of currentQueue) {
      try {
        await fetchFn(req.input, req.init)
      } catch (_error) {
        remainingRequests.push(req)
      }
    }

    if (remainingRequests.length > 0) {
      // Re-add failed requests to the FRONT of the queue to maintain order
      this.queue = [...remainingRequests, ...this.queue]
      this.persist()
    }
  }

  /**
   * Clears the entire queue
   */
  clear(): void {
    this.queue = []
    this.persist()
  }

  private persist() {
    if (this.options.storage === 'localStorage' && typeof localStorage !== 'undefined') {
      localStorage.setItem('beam_offline_queue', JSON.stringify(this.queue))
    }
  }

  private loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('beam_offline_queue')
      if (stored) {
        try {
          this.queue = JSON.parse(stored)
        } catch (_e) {
          this.queue = []
        }
      }
    }
  }
}
