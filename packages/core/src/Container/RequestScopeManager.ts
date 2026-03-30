import type { ServiceKey } from '../Container'
import { RequestScopeMetrics, type RequestScopeObserver } from './RequestScopeMetrics'

/**
 * Manages request-scoped service instances within a single HTTP request.
 *
 * Each request gets its own RequestScopeManager instance with isolated state.
 * Services are cached within the request and automatically cleaned up when
 * the request ends.
 *
 * @example
 * ```typescript
 * const scope = new RequestScopeManager()
 * const cache = scope.resolve('productCache', () => new ProductCache())
 * // ... use cache ...
 * await scope.cleanup() // Called automatically by Gravito engine
 * ```
 */
export class RequestScopeManager {
  private scoped = new Map<string, unknown>()
  private metadata = new Map<string, Record<string, unknown>>()
  private metrics = new RequestScopeMetrics()
  private observer: RequestScopeObserver | null = null

  constructor(observer?: RequestScopeObserver) {
    this.observer = observer || null
  }

  /**
   * Set observer for monitoring scope lifecycle
   */
  setObserver(observer: RequestScopeObserver): void {
    this.observer = observer
  }

  /**
   * Get metrics for this scope
   */
  getMetrics(): RequestScopeMetrics {
    return this.metrics
  }

  /**
   * Resolve or retrieve a request-scoped service instance.
   *
   * If the service already exists in this scope, returns the cached instance.
   * Otherwise, calls the factory function to create a new instance and caches it.
   *
   * Automatically detects and records services with cleanup methods.
   *
   * @template T - The type of the service.
   * @param key - The service key (for caching).
   * @param factory - Factory function to create the instance if not cached.
   * @returns The cached or newly created instance.
   */
  resolve<T>(key: ServiceKey, factory: () => T): T {
    const keyStr = String(key)
    const isFromCache = this.scoped.has(keyStr)

    if (!isFromCache) {
      const instance = factory()
      this.scoped.set(keyStr, instance)

      // Record metadata for cleanup detection
      if (instance && typeof instance === 'object' && 'cleanup' in instance) {
        this.metadata.set(keyStr, { hasCleanup: true })
      }
    }

    // Notify observer
    this.observer?.onServiceResolved?.(key, isFromCache)

    return this.scoped.get(keyStr) as T
  }

  /**
   * Clean up all request-scoped instances.
   *
   * Calls the cleanup() method on each service that has one.
   * Silently ignores cleanup errors to prevent cascading failures.
   * Called automatically by the Gravito engine in the request finally block.
   *
   * @returns Promise that resolves when all cleanup is complete.
   */
  async cleanup(): Promise<void> {
    this.metrics.recordCleanupStart()
    this.observer?.onCleanupStart?.()

    const errors: unknown[] = []
    let servicesCleaned = 0

    for (const [, instance] of this.scoped) {
      if (instance && typeof instance === 'object' && 'cleanup' in instance) {
        const fn = (instance as Record<string, unknown>)['cleanup']
        if (typeof fn === 'function') {
          try {
            await fn.call(instance)
            servicesCleaned++
          } catch (error) {
            // Collect errors but continue cleanup
            errors.push(error)
            this.observer?.onCleanupError?.(
              error instanceof Error ? error : new Error(String(error))
            )
          }
        }
      }
    }

    const scopeSize = this.scoped.size
    this.scoped.clear()
    this.metadata.clear()

    // Record metrics
    this.metrics.recordCleanupEnd(scopeSize, servicesCleaned, errors.length)
    this.observer?.onCleanupEnd?.(this.metrics)

    // Log errors if any occurred
    if (errors.length > 0) {
      console.error('RequestScope cleanup errors:', errors)
    }
  }

  /**
   * Get the number of services in this scope (for monitoring).
   *
   * @returns The count of cached services.
   */
  size(): number {
    return this.scoped.size
  }
}
