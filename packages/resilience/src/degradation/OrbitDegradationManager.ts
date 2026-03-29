import { CircuitOpenException } from '../exceptions/CircuitOpenException'
import type { DegradedResult } from './DegradedResult'

/**
 * Internal entry for a registered fallback.
 * Immutable fields are marked readonly; mutable cache fields are not
 * mutated in place — new objects are created on every cache update.
 */
interface FallbackEntry<T> {
  readonly fn: () => Promise<T> | T
  readonly ttl: number
  readonly cachedValue?: T
  readonly cachedAt?: number
}

/**
 * Manages graceful degradation when Orbit circuit breakers are open.
 *
 * When an Orbit call fails with a `CircuitOpenException`, the manager
 * transparently returns a typed `DegradedResult<T>` from the registered
 * fallback instead of propagating the exception to callers.
 *
 * @remarks
 * - In `NODE_ENV=test` the degradation layer is bypassed completely (D-05):
 *   `CircuitOpenException` propagates as-is to keep test assertions predictable.
 * - Fallbacks are cached by `orbitName` for `ttl` milliseconds. `ttl=0` disables caching.
 * - Cache state is updated immutably (new object created, never mutated in place).
 *
 * @public
 */
export class OrbitDegradationManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly fallbacks = new Map<string, FallbackEntry<any>>()

  /**
   * Register a fallback function for the given orbit name.
   *
   * @param orbitName - The unique name of the Orbit (matches the circuit breaker name).
   * @param options.fn - The fallback function to invoke when the circuit is open.
   * @param options.ttl - How long (ms) to cache the fallback result. Use `0` to disable caching.
   */
  registerFallback<T>(orbitName: string, options: { fn: () => Promise<T> | T; ttl: number }): void {
    this.fallbacks.set(orbitName, { fn: options.fn, ttl: options.ttl })
  }

  /**
   * Execute `fn` and return a `DegradedResult<T>`.
   *
   * - On success: returns `{ value, degraded: false, source: 'live' }`.
   * - On `CircuitOpenException` with registered fallback: returns `{ value, degraded: true, source: 'fallback' }`.
   * - On `CircuitOpenException` with no registered fallback: re-throws.
   * - On any other error: re-throws unchanged.
   *
   * **D-05:** In `NODE_ENV=test`, this method does not intercept `CircuitOpenException`;
   * the exception propagates to keep test assertions clear and predictable.
   *
   * @param orbitName - The orbit name, used to look up the registered fallback.
   * @param fn - The primary async operation to execute.
   */
  async execute<T>(orbitName: string, fn: () => Promise<T>): Promise<DegradedResult<T>> {
    // D-05: In test environment, skip fallback logic entirely
    if (process.env.NODE_ENV === 'test') {
      const value = await fn()
      return { value, degraded: false, source: 'live' }
    }

    try {
      const value = await fn()
      return { value, degraded: false, source: 'live' }
    } catch (err) {
      if (err instanceof CircuitOpenException) {
        const entry = this.fallbacks.get(orbitName) as FallbackEntry<T> | undefined

        if (entry == null) {
          throw err
        }

        // Check TTL cache: only use cache when ttl > 0 and cache is still fresh
        if (
          entry.ttl > 0 &&
          entry.cachedValue !== undefined &&
          entry.cachedAt !== undefined &&
          Date.now() - entry.cachedAt < entry.ttl
        ) {
          return { value: entry.cachedValue, degraded: true, source: 'fallback' }
        }

        // Invoke fallback and update cache immutably
        const fallbackValue = await entry.fn()

        // Immutable cache update: create new FallbackEntry object, never mutate in place
        this.fallbacks.set(orbitName, {
          ...entry,
          cachedValue: fallbackValue,
          cachedAt: Date.now(),
        })

        return { value: fallbackValue, degraded: true, source: 'fallback' }
      }

      // Non-CircuitOpenException errors propagate unchanged
      throw err
    }
  }
}
