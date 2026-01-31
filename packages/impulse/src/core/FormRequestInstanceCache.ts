/**
 * Performance optimization utility for FormRequest instance caching.
 *
 * Caches FormRequest instances to avoid repeated object allocation
 * in high-frequency validation scenarios.
 *
 * @public
 * @since 3.1.0
 */
export class FormRequestInstanceCache {
  /**
   * WeakMap cache for FormRequest instances keyed by constructor.
   * Using WeakMap prevents memory leaks as constructors can be garbage collected.
   */
  private static instanceCache = new WeakMap<new () => any, any>()

  /**
   * Get or create a cached FormRequest instance.
   *
   * This method provides significant performance improvements for repeated
   * validations with the same FormRequest class by reusing instances.
   *
   * @param RequestClass - The FormRequest constructor class
   * @returns Cached or newly created instance
   */
  static getInstance<T>(RequestClass: new () => T): T {
    // Check cache first (WeakMap lookup is O(1))
    let instance = this.instanceCache.get(RequestClass)

    if (!instance) {
      // Cache miss: create new instance and cache it
      instance = new RequestClass()
      this.instanceCache.set(RequestClass, instance)
    }

    return instance
  }

  /**
   * Clear the cache (useful for testing or hot reloading).
   * In production, the WeakMap will automatically clean up when constructors are GC'd.
   */
  static clearCache(): void {
    this.instanceCache = new WeakMap<new () => any, any>()
  }

  /**
   * Get cache statistics for monitoring.
   * Note: WeakMap doesn't provide size information for privacy reasons.
   */
  static getCacheStats(): { message: string } {
    return {
      message: 'FormRequest instances cached (WeakMap does not expose size)',
    }
  }
}
