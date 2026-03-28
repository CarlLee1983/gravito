import { ImpulseError } from '../errors/ImpulseError'
import { ImpulseErrorCodes } from '../errors/codes'
import type { SchemaValidator } from '../validation/SchemaValidator'

/**
 * Schema Validator Cache
 *
 * Significantly improves the performance of repeated validations by caching the mapping between schemas and validators.
 * Avoids re-traversing all validators to determine the schema type for every validation request.
 *
 * Performance Optimization Techniques:
 * - **WeakMap Cache**: O(1) time complexity lookups without causing memory leaks.
 * - **Automatic Cleanup**: Cache entries are automatically removed when the schema object is garbage collected.
 * - **Validator Pre-registration**: Avoids repeatedly fetching the validator list from the factory.
 *
 * Performance Gains:
 * - First validation: Requires traversing the validator list (O(n)).
 * - Subsequent validations: Returns directly from the cache (O(1)).
 * - For repeated validation of the same schema, performance can improve by 10-100 times.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { SchemaCache } from '@gravito/impulse'
 *
 * const schema = z.object({ name: z.string() })
 *
 * // First lookup: traverses the validator list
 * const validator1 = SchemaCache.getValidator(schema)  // ~0.1ms
 *
 * // Second lookup: returns from cache
 * const validator2 = SchemaCache.getValidator(schema)  // ~0.001ms
 * ```
 */
export class SchemaCache {
  /**
   * Mapping cache from Schema to validator
   *
   * Reasons for using WeakMap instead of Map:
   * - Keys in WeakMap are weak references, which do not prevent the schema object from being garbage collected.
   * - Prevents memory leaks, especially in scenarios where schemas are generated dynamically.
   * - Cache entries are automatically cleared when the schema object is no longer in use.
   */
  private static schemaValidatorCache = new WeakMap<object, SchemaValidator>()

  /**
   * List of registered validator instances
   *
   * Caches the validator list to avoid fetching from the factory every time, reducing array copy overhead.
   */
  private static validatorInstances: SchemaValidator[] = []

  /**
   * Register validators for cache lookup
   *
   * Called during module initialization to preload all available validators.
   * This avoids fetching the validator list from the factory during every lookup.
   *
   * @param validators - Array of validators to register
   *
   * @example
   * ```typescript
   * import { ZodValidator, ValibotValidator } from '@gravito/impulse'
   *
   * SchemaCache.registerValidators([
   *   new ZodValidator(),
   *   new ValibotValidator()
   * ])
   * ```
   */
  static registerValidators(validators: SchemaValidator[]): void {
    this.validatorInstances = [...validators]
  }

  /**
   * Get the validator corresponding to a schema (with caching)
   *
   * Implements the following caching strategy:
   * 1. Fast path: Primitives (non-objects) are detected directly and cannot be cached.
   * 2. Cache hit: Returns immediately from the WeakMap cache (O(1)).
   * 3. Cache miss: Detects the validator and adds it to the cache.
   *
   * This method is an optimization point for validation process performance bottlenecks, offering significant gains for high-frequency validation scenarios.
   *
   * @param schema - The schema for which to find a validator
   * @returns A validator that can handle the schema
   *
   * @throws {Error} If no validator supporting the schema is found
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const userSchema = z.object({ name: z.string() })
   *
   * // First time: detect and cache
   * const validator = SchemaCache.getValidator(userSchema)
   *
   * // Subsequent use of the same schema object: returns from cache
   * const cachedValidator = SchemaCache.getValidator(userSchema)
   * console.log(validator === cachedValidator)  // true
   * ```
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
    throw new ImpulseError(
      ImpulseErrorCodes.UNSUPPORTED_SCHEMA,
      'Unsupported schema type. Use Zod or Valibot.'
    )
  }

  /**
   * Clear the cache (useful for testing or hot reloading).
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
