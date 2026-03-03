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
export declare class RequestScopeManager {
  private scoped
  private metadata
  private metrics
  private observer
  constructor(observer?: RequestScopeObserver)
  /**
   * Set observer for monitoring scope lifecycle
   */
  setObserver(observer: RequestScopeObserver): void
  /**
   * Get metrics for this scope
   */
  getMetrics(): RequestScopeMetrics
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
  resolve<T>(key: ServiceKey, factory: () => T): T
  /**
   * Clean up all request-scoped instances.
   *
   * Calls the cleanup() method on each service that has one.
   * Silently ignores cleanup errors to prevent cascading failures.
   * Called automatically by the Gravito engine in the request finally block.
   *
   * @returns Promise that resolves when all cleanup is complete.
   */
  cleanup(): Promise<void>
  /**
   * Get the number of services in this scope (for monitoring).
   *
   * @returns The count of cached services.
   */
  size(): number
}
