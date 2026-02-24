import type { Env, Photon, Schema } from '@gravito/photon'
import { hc as beamClient } from '@gravito/photon/client'
import { BeamError, BeamNetworkError } from './errors'
import { ConnectionPool } from './pool'
import type { BeamOptions } from './types'
import {
  createFetchWithTimeout,
  executeWithRetry,
  mergeAbortSignals,
  OfflineQueue,
  RequestDeduplicator,
  resolveHeaders,
} from './utils'

/**
 * Orbit Beam - Lightweight type-safe RPC client for Gravito applications.
 *
 * This function creates a type-safe API client by wrapping the underlying Beam client.
 * It provides a seamless development experience similar to tRPC but with **zero runtime overhead**.
 * The client directly delegates to Photon's high-performance HTTP engine.
 *
 * ### Key Features
 * - **Zero Runtime Overhead**: Pure type wrapper, no additional abstraction layers.
 * - **Type Safety**: Automatically infers types from your backend `AppType` or `AppRoutes`.
 * - **IntelliSense**: Full autocomplete for routes, methods, and request/response bodies.
 *
 * @template T - The generic type parameter representing your Photon app or routes.
 *   - `AppType`: `typeof app` - For direct route definitions.
 *   - `AppRoutes`: `ReturnType<typeof createApp>` - For modular app.route() chains.
 *
 * @param baseUrl - The root URL of your API server (e.g., `'http://localhost:3000'`).
 * @param options - Optional configuration for the client (headers, credentials, etc.).
 * @returns A fully typed Beam client proxy for your API.
 *
 * @example
 * ```typescript
 * import { createBeam } from '@gravito/beam'
 * import type { AppType } from './server'
 *
 * const client = createBeam<AppType>('http://localhost:3000')
 *
 * // Fully typed GET request
 * const res = await client.hello.$get()
 * const data = await res.json()
 * ```
 *
 * @public
 */
export function createBeam<T extends Photon<Env, Schema, string>>(
  baseUrl: string,
  options?: BeamOptions
): ReturnType<typeof beamClient<T>> {
  // Fast path: delegate directly when no advanced options are used (zero overhead)
  if (
    !options?.timeout &&
    !options?.retry &&
    !options?.deduplicate &&
    !options?.offlineQueue &&
    !options?.onRequest &&
    !options?.onResponse &&
    !options?.onError &&
    !options?.pool
  ) {
    return beamClient<T>(baseUrl, options)
  }

  // Advanced path: wrap fetch to support new features
  const wrappedFetch = createEnhancedFetch(options)

  return beamClient<T>(baseUrl, {
    ...options,
    fetch: wrappedFetch,
  })
}

/**
 * Creates an enhanced fetch function with support for timeout, retry, deduplication, connection pooling, and interceptors
 */
function createEnhancedFetch(options: BeamOptions) {
  // Create connection pool if enabled
  const pool = options.pool
    ? new ConnectionPool(typeof options.pool === 'boolean' ? {} : options.pool)
    : null

  // Create deduplicator instance if enabled
  const deduplicator = options.deduplicate
    ? new RequestDeduplicator(options.deduplicateWindow)
    : null

  // Create offline queue if enabled
  const offlineQueue = options.offlineQueue?.enabled ? new OfflineQueue(options.offlineQueue) : null

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let config = init || {}
    try {
      // 1. Resolve dynamic headers
      const headers = await resolveHeaders(options.headers)
      if (headers) {
        // Safely merge headers (supports Headers instance or object)
        const mergedHeaders = new Headers(config.headers)
        Object.entries(headers).forEach(([key, value]) => {
          mergedHeaders.set(key, value)
        })
        config = {
          ...config,
          headers: Object.fromEntries(mergedHeaders.entries()),
        }
      }

      // 2. Execute onRequest interceptor
      if (options.onRequest) {
        config = await options.onRequest(config)
      }

      // 3. Merge signals if user provided one
      if (options.signal) {
        const mergedSignal = mergeAbortSignals([
          options.signal as AbortSignal,
          config.signal as AbortSignal | undefined,
        ])
        config = { ...config, signal: mergedSignal }
      }

      // 4. Create base fetch function (with possible timeout, connection pooling, and signal support)
      const timeoutFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> =
        options.timeout
          ? createFetchWithTimeout(options.timeout, options.signal as AbortSignal | undefined)
          : (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)

      const baseFetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = pool
        ? pool.createPooledFetch()
        : timeoutFn

      // Wrap with deduplicator if enabled
      const fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> =
        deduplicator
          ? (input: RequestInfo | URL, init?: RequestInit) =>
              deduplicator.fetch(baseFetchFn, input, init)
          : baseFetchFn

      // 5. Execute request (with possible retry)
      let response = await (options.retry
        ? executeWithRetry(() => fetchFn(input, config), options.retry)
        : fetchFn(input, config))

      // 5. Execute onResponse interceptor
      if (options.onResponse) {
        response = await options.onResponse(response)
      }

      return response
    } catch (error) {
      // 6. Handle offline queue if enabled
      if (offlineQueue && (error instanceof BeamNetworkError || error instanceof Error)) {
        const { signal: _s, ...configWithoutSignal } = config
        await offlineQueue.add(fetch.bind(globalThis), input, configWithoutSignal)
      }

      // 7. Execute onError interceptor
      const beamError =
        error instanceof BeamError ? error : new BeamNetworkError('Request failed', error)

      if (options.onError) {
        await options.onError(beamError)
      }

      throw beamError
    }
  }
}

/**
 * Backward compatible alias for {@link createBeam}.
 *
 * @deprecated Use {@link createBeam} instead. This alias will be removed in future versions.
 * @public
 */
export const createGravitoClient = createBeam

export {
  BeamError,
  BeamHttpError,
  BeamNetworkError,
  BeamPoolExhaustedError,
  BeamTimeoutError,
} from './errors'
export {
  collectJsonLines,
  consumeJsonLines,
  createAuthenticatedBeam,
  createCachedHeaderResolver,
  safeResponse,
  unwrapResponse,
  validateResponse,
} from './helpers'
export type {
  ConnectionPoolConfig,
  HostPoolMetrics,
  PoolEntryMetadata,
  PoolMetricsSnapshot,
} from './pool'
export { ConnectionPool } from './pool'
export type {
  BeamOptions,
  BeamOptions as GravitoClientOptions,
  RetryOptions,
} from './types'
