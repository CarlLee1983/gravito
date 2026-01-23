import type { SchemaValidator } from '../validation/SchemaValidator'

/**
 * Performance optimization utility for schema type detection.
 *
 * Caches schema type detection results to avoid repeated expensive
 * type checking operations in validation hot paths.
 *
 * @public
 * @since 3.1.0
 */
export class SchemaCache {
  /**
   * WeakMap cache for schema type detection results.
   * Using WeakMap prevents memory leaks as schemas can be garbage collected.
   */
  private static schemaValidatorCache = new WeakMap<object, SchemaValidator>()

  /**
   * Cache for validator instance lookup to avoid repeated array iteration.
   */
  private static validatorInstances: SchemaValidator[] = []

  /**
   * Register validators for cached lookups.
   * Should be called during module initialization.
   */
  static registerValidators(validators: SchemaValidator[]): void {
    this.validatorInstances = [...validators]
  }

  /**
   * Get cached validator for a schema, with fallback to detection.
   *
   * This method provides significant performance improvements for repeated
   * validations with the same schema objects.
   *
   * @param schema - The schema to find validator for
   * @returns The appropriate validator
   * @throws Error if no suitable validator is found
   */
  static getValidator(schema: unknown): SchemaValidator {
    // Fast path: primitive types cannot be cached
    if (typeof schema !== 'object' || schema === null) {
      return this.detectValidator(schema)
    }

    // Check cache first (WeakMap lookup is O(1))
    const cached = this.schemaValidatorCache.get(schema)
    if (cached) {
      return cached
    }

    // Cache miss: detect and cache
    const validator = this.detectValidator(schema)
    this.schemaValidatorCache.set(schema, validator)

    return validator
  }

  /**
   * Detect appropriate validator for a schema.
   * This is the fallback when cache misses or for primitive types.
   */
  private static detectValidator(schema: unknown): SchemaValidator {
    for (const validator of this.validatorInstances) {
      if (validator.canHandle(schema)) {
        return validator
      }
    }
    throw new Error('Unsupported schema type. Use Zod or Valibot.')
  }

  /**
   * Clear the cache (useful for testing).
   * In production, the WeakMap will automatically clean up when schemas are GC'd.
   */
  static clearCache(): void {
    this.schemaValidatorCache = new WeakMap<object, SchemaValidator>()
  }

  /**
   * Get cache statistics for monitoring.
   * Note: WeakMap doesn't provide size information for privacy reasons.
   */
  static getCacheStats(): { registeredValidators: number } {
    return {
      registeredValidators: this.validatorInstances.length,
    }
  }
}
