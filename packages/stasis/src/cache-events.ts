/**
 * Cache event system types and dispatcher.
 *
 * Provides event mode definitions, event handler contracts,
 * and the core emit logic for cache lifecycle events.
 *
 * @public
 * @since 3.0.0
 */

/**
 * Supported modes for emitting cache events.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEventMode = 'sync' | 'async' | 'off'

/**
 * Event handlers for cache lifecycle events.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEvents = {
  /** Triggered on a cache hit. */
  hit?: (key: string) => void | Promise<void>
  /** Triggered on a cache miss. */
  miss?: (key: string) => void | Promise<void>
  /** Triggered when a value is written to the cache. */
  write?: (key: string) => void | Promise<void>
  /** Triggered when a value is removed from the cache. */
  forget?: (key: string) => void | Promise<void>
  /** Triggered when the entire cache is flushed. */
  flush?: () => void | Promise<void>
}

/**
 * Configuration for the cache event emitter.
 *
 * @internal
 */
export type CacheEventEmitterConfig = {
  mode: CacheEventMode
  throwOnError?: boolean
  onError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void
}

/**
 * Emit a cache lifecycle event according to the configured mode.
 *
 * @param event - The cache event name
 * @param payload - Event payload
 * @param events - Event handler map
 * @param config - Emitter configuration
 * @internal
 */
export function emitCacheEvent(
  event: keyof CacheEvents,
  payload: { key?: string },
  events: CacheEvents | undefined,
  config: CacheEventEmitterConfig
): void | Promise<void> {
  const { mode, throwOnError, onError } = config

  if (mode === 'off') {
    return
  }

  const fn = events?.[event]
  if (!fn) {
    return
  }

  const invoke = (): void | Promise<void> => {
    if (event === 'flush') {
      return (fn as NonNullable<CacheEvents['flush']>)()
    }
    const key = payload.key ?? ''
    return (
      fn as NonNullable<
        CacheEvents['hit'] | CacheEvents['miss'] | CacheEvents['write'] | CacheEvents['forget']
      >
    )(key)
  }

  const reportError = (error: unknown): void => {
    try {
      onError?.(error, event, payload)
    } catch {
      // ignore to keep cache ops safe
    }
  }

  if (mode === 'sync') {
    try {
      return Promise.resolve(invoke()).catch((error) => {
        reportError(error)
        if (throwOnError) {
          throw error
        }
      })
    } catch (error) {
      reportError(error)
      if (throwOnError) {
        throw error
      }
    }
    return
  }

  queueMicrotask(() => {
    try {
      const result = invoke()
      if (result && typeof (result as Promise<void>).catch === 'function') {
        void (result as Promise<void>).catch(reportError)
      }
    } catch (error) {
      reportError(error)
    }
  })
}
