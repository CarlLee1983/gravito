import type { CacheStore } from '../store'
import type { CacheKey, CacheTtl } from '../types'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Options for the CircuitBreakerStore.
 */
export type CircuitBreakerOptions = {
  /**
   * Number of consecutive failures before opening the circuit.
   * @default 5
   */
  maxFailures?: number
  /**
   * Time in milliseconds to stay in OPEN state before transitioning to HALF_OPEN.
   * @default 60000
   */
  resetTimeout?: number
  /**
   * Optional fallback store to use when the primary store is unavailable.
   */
  fallback?: CacheStore
}

/**
 * A protective wrapper for cache stores that prevents cascading failures
 * through circuit-breaking logic.
 *
 * When the primary store encounters repeated failures, the circuit opens,
 * temporarily bypassing the primary store and optionally using a fallback.
 *
 * @public
 * @since 3.2.0
 */
export class CircuitBreakerStore implements CacheStore {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private lastErrorTime = 0
  private options: Required<Omit<CircuitBreakerOptions, 'fallback'>> & { fallback?: CacheStore }

  constructor(
    private readonly primary: CacheStore,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      maxFailures: options.maxFailures ?? 5,
      resetTimeout: options.resetTimeout ?? 60_000,
      fallback: options.fallback,
    }
  }

  private async execute<T>(
    operation: (store: CacheStore) => Promise<T>,
    fallbackResult: T = null as any
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastErrorTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        return this.handleFallback(operation, fallbackResult)
      }
    }

    try {
      const result = await operation(this.primary)
      this.onSuccess()
      return result
    } catch (_error) {
      this.onFailure()
      return this.handleFallback(operation, fallbackResult)
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastErrorTime = Date.now()
    if (this.failures >= this.options.maxFailures) {
      this.state = 'OPEN'
    }
  }

  private async handleFallback<T>(
    operation: (store: CacheStore) => Promise<T>,
    fallbackResult: T
  ): Promise<T> {
    if (this.options.fallback) {
      try {
        return await operation(this.options.fallback)
      } catch {
        // Fallback also failed
      }
    }

    return fallbackResult
  }

  async get<T = unknown>(key: CacheKey): Promise<T | null> {
    return this.execute((s) => s.get<T>(key))
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    return this.execute((s) => s.put(key, value, ttl))
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    return this.execute((s) => s.add(key, value, ttl), false)
  }

  async forget(key: CacheKey): Promise<boolean> {
    return this.execute((s) => s.forget(key), false)
  }

  async flush(): Promise<void> {
    return this.execute((s) => s.flush())
  }

  async increment(key: CacheKey, value?: number): Promise<number> {
    return this.execute((s) => s.increment(key, value), 0)
  }

  async decrement(key: CacheKey, value?: number): Promise<number> {
    return this.execute((s) => s.decrement(key, value), 0)
  }

  async ttl(key: CacheKey): Promise<number | null> {
    return this.execute(async (s) => (s.ttl ? s.ttl(key) : null))
  }

  /**
   * Returns current state for monitoring.
   */
  getState(): CircuitState {
    return this.state
  }
}
