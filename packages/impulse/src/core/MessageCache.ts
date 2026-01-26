/**
 * Performance optimization utility for message resolution caching.
 *
 * Caches message lookup results to avoid repeated calls to `messages()`
 * method and message provider operations.
 *
 * @public
 * @since 3.1.0
 */
export class MessageCache {
  /**
   * WeakMap cache for messages() method results keyed by FormRequest instances.
   * Using WeakMap prevents memory leaks as instances can be garbage collected.
   */
  private static messagesMethodCache = new WeakMap<object, Record<string, string>>()

  /**
   * Map cache for resolved message results keyed by a compound key.
   * Using Map for compound keys since we need to serialize the lookup parameters.
   */
  private static messageResolutionCache = new Map<string, string>()

  /**
   * Get cached messages() method result for a FormRequest instance.
   *
   * This method provides significant performance improvements for repeated
   * message resolutions with the same FormRequest instance.
   *
   * @param instance - The FormRequest instance
   * @returns Cached or newly computed messages object
   */
  static getInstanceMessages(instance: {
    messages?(): Record<string, string>
  }): Record<string, string> | undefined {
    if (!instance.messages) {
      return undefined
    }

    // Check cache first (WeakMap lookup is O(1))
    let messages = this.messagesMethodCache.get(instance)

    if (!messages) {
      // Cache miss: call messages() and cache result
      messages = instance.messages()
      this.messagesMethodCache.set(instance, messages)
    }

    return messages
  }

  /**
   * Get cached message resolution result.
   *
   * Caches the complete message resolution pipeline including:
   * - Custom messages() method lookup
   * - MessageProvider fallback
   * - Default message fallback
   */
  static getCachedMessage(cacheKey: string, resolver: () => string): string {
    // Check resolution cache first
    let result = this.messageResolutionCache.get(cacheKey)

    if (result === undefined) {
      // Cache miss: compute and cache result
      result = resolver()
      this.messageResolutionCache.set(cacheKey, result)
    }

    return result
  }

  /**
   * Create a cache key for message resolution.
   *
   * @param instanceId - Unique identifier for the FormRequest instance
   * @param field - The field name
   * @param code - The error code (optional)
   * @param defaultMessage - The default message
   * @returns Cache key string
   */
  static createCacheKey(
    instanceId: string,
    field: string,
    code: string | undefined,
    defaultMessage: string
  ): string {
    return `${instanceId}:${field}:${code ?? 'no-code'}:${defaultMessage}`
  }

  /**
   * Clear all caches (useful for testing).
   */
  static clearCache(): void {
    this.messagesMethodCache = new WeakMap<object, Record<string, string>>()
    this.messageResolutionCache = new Map<string, string>()
  }

  /**
   * Get cache statistics for monitoring.
   */
  static getCacheStats(): {
    messageResolutionCacheSize: number
    messagesMethodCacheInfo: string
  } {
    return {
      messageResolutionCacheSize: this.messageResolutionCache.size,
      messagesMethodCacheInfo: 'WeakMap size not exposed for privacy',
    }
  }
}
