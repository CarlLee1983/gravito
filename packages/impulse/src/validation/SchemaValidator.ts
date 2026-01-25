/**
 * Unified interface for Schema validation results
 *
 * Provides a standardized validation result format that is independent of the validation library.
 * Whether using Zod, Valibot, or other validation libraries, they will be converted to this unified format.
 *
 * Design Philosophy:
 * - **Consistency**: The result format is unified across different validation libraries, simplifying error handling logic.
 * - **Detail**: Provides complete error paths and codes for easy problem location.
 * - **Serializability**: All fields can be safely converted to JSON, suitable for API responses.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // Result of successful validation
 * const successResult: SchemaValidationResult = {
 *   success: true,
 *   data: { name: 'John', email: 'john@example.com' }
 * }
 *
 * // Result of failed validation
 * const failureResult: SchemaValidationResult = {
 *   success: false,
 *   errors: [
 *     {
 *       path: ['email'],
 *       message: 'Invalid email format',
 *       code: 'invalid_string'
 *     }
 *   ]
 * }
 * ```
 */
export interface SchemaValidationResult {
  /** Whether the validation was successful */
  success: boolean
  /** Parsed data when validation is successful (may have undergone type conversion) */
  data?: unknown
  /** Array of errors when validation fails; each error contains path, message, and code */
  errors?: Array<{
    /** Path to the error field (represented as an array, e.g., ['user', 'email'] for user.email) */
    path: string[]
    /** Human-readable error message */
    message: string
    /** Machine-readable error code (e.g., 'invalid_string', 'too_small') */
    code?: string | undefined
  }>
}

/**
 * Abstract base class for Schema validators
 *
 * Implements the Strategy Pattern, allowing the system to support multiple validation libraries.
 * Each concrete validator (e.g., ZodValidator, ValibotValidator) inherits from this class.
 *
 * Design Pattern Advantages:
 * - **Open-Closed Principle**: Easily add support for new validation libraries without modifying existing code.
 * - **Unified Interface**: All validators provide a consistent API, simplifying usage.
 * - **Runtime Selection**: Automatically choose the appropriate validator based on the schema type.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // Implement a custom validator
 * class CustomValidator extends SchemaValidator {
 *   canHandle(schema: unknown): boolean {
 *     // Check if the schema is a type supported by this validator
 *     return schema instanceof CustomSchema
 *   }
 *
 *   async validate(schema: unknown, data: unknown): Promise<SchemaValidationResult> {
 *     // Execute validation logic
 *     try {
 *       const result = (schema as CustomSchema).validate(data)
 *       return { success: true, data: result }
 *     } catch (error) {
 *       return {
 *         success: false,
 *         errors: [{ path: [], message: error.message }]
 *       }
 *     }
 *   }
 * }
 *
 * // Register the custom validator
 * SchemaValidatorFactory.register(new CustomValidator())
 * ```
 */
export abstract class SchemaValidator {
  /**
   * Validate data using a schema
   *
   * Concrete validation logic is implemented by subclasses, which must convert the validation library's results into the unified `SchemaValidationResult` format.
   *
   * @param schema - The validation schema object
   * @param data - The data to be validated
   * @returns Validation result in unified format
   */
  abstract validate(schema: unknown, data: unknown): Promise<SchemaValidationResult>

  /**
   * Check if this validator can handle the given schema
   *
   * Used for automatically selecting the appropriate validator at runtime. Each validator checks whether the schema is of a supported type using duck typing or instanceof checks.
   *
   * @param schema - The schema object to check
   * @returns Whether this schema is supported
   */
  abstract canHandle(schema: unknown): boolean
}

/**
 * Schema Validator Factory
 *
 * Manages all registered validators and automatically selects the appropriate one based on the schema type.
 * Uses the Factory Pattern and caching mechanisms to optimize performance and avoid redundant validator lookups.
 *
 * How it works:
 * 1. Register all supported validators (ZodValidator, ValibotValidator, etc.) during application startup.
 * 2. Upon receiving a validation request, traverse the registered validators to find the first one that can handle the schema.
 * 3. Use SchemaCache to cache the mapping between schemas and validators, improving the speed of subsequent lookups.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // Register a custom validator (typically executed during application initialization)
 * import { SchemaValidatorFactory } from '@gravito/impulse'
 * import { CustomValidator } from './validators/CustomValidator'
 *
 * SchemaValidatorFactory.register(new CustomValidator())
 *
 * // Automatically select a validator (called internally by FormRequest)
 * const validator = SchemaValidatorFactory.getValidator(mySchema)
 * const result = await validator.validate(mySchema, data)
 * ```
 */
export class SchemaValidatorFactory {
  /** Array of registered validators, stored in order of registration */
  private static validators: SchemaValidator[] = []

  /**
   * Register a new schema validator
   *
   * Adds a validator to the list of available validators. The order of registration affects the selection priority; the first matching validator will be used.
   *
   * @param validator - The validator instance to register
   *
   * @example
   * ```typescript
   * // Register built-in validators (automatically completed in validation/index.ts)
   * SchemaValidatorFactory.register(new ZodValidator())
   * SchemaValidatorFactory.register(new ValibotValidator())
   * ```
   */
  static register(validator: SchemaValidator): void {
    this.validators.push(validator)
  }

  /**
   * Obtain the appropriate validator for a schema (with caching)
   *
   * Uses SchemaCache to cache the mapping between schemas and validators, significantly improving the performance of repeated validations.
   * For the same schema object, subsequent lookups will return directly from the cache, avoiding the need to traverse all validators.
   *
   * @param schema - The schema object to be validated
   * @returns A validator that can handle the schema
   *
   * @throws {Error} If no validator supporting the schema is found
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const schema = z.object({ name: z.string() })
   * const validator = SchemaValidatorFactory.getValidator(schema)
   * // Returns a ZodValidator instance
   *
   * // Second lookup of the same schema uses the cache
   * const cachedValidator = SchemaValidatorFactory.getValidator(schema)
   * // Returns immediately without traversing the validator list
   * ```
   */
  static getValidator(schema: unknown): SchemaValidator {
    // Import SchemaCache lazily to avoid circular dependency
    const { SchemaCache } = require('../core/SchemaCache')

    // Delegate to cached implementation
    return SchemaCache.getValidator(schema)
  }

  /**
   * Get all registered validators
   *
   * This method is used internally by SchemaCache to traverse validators and find matching instances.
   * Returns a copy of the validator array to prevent external modification of internal state.
   *
   * @internal
   * @returns A copy of the array of registered validators
   */
  static getValidators(): SchemaValidator[] {
    return [...this.validators]
  }
}
