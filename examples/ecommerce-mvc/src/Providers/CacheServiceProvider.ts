/**
 * Cache Service Provider
 *
 * Registers request-scoped cache services to the IoC container.
 * These services are automatically instantiated per request and cleaned up
 * when the request ends.
 */

import type { Container } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { RequestProductCache } from '../Services/RequestProductCache'

export class CacheServiceProvider extends ServiceProvider {
  /**
   * Register request-scoped cache services
   *
   * Each service is scoped to a single HTTP request:
   * - New instance created for each request
   * - Cached within the request lifetime
   * - Automatically cleaned up when request ends
   */
  register(container: Container): void {
    // Request-scoped product cache
    // Caches products within a single request, avoiding N+1 queries
    container.scoped('product:cache', () => new RequestProductCache())
  }
}
