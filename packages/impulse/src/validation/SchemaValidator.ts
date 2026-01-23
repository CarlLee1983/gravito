/**
 * Schema-agnostic validation result interface
 *
 * @public
 * @since 3.0.0
 */
export interface SchemaValidationResult {
  success: boolean
  data?: unknown
  errors?: Array<{
    path: string[]
    message: string
    code?: string | undefined
  }>
}

/**
 * Abstract base class for schema validators.
 *
 * Implements the Strategy pattern to support multiple validation libraries
 * (Zod, Valibot, etc.) with a common interface.
 *
 * @public
 * @since 3.0.0
 */
export abstract class SchemaValidator {
  /**
   * Validate data against a schema.
   *
   * @param schema - The schema to validate against.
   * @param data - The data to validate.
   * @returns Promise resolving to validation result.
   */
  abstract validate(schema: unknown, data: unknown): Promise<SchemaValidationResult>

  /**
   * Check if this validator can handle the given schema.
   *
   * @param schema - The schema to check.
   * @returns True if this validator supports the schema.
   */
  abstract canHandle(schema: unknown): boolean
}

/**
 * Factory for creating appropriate schema validators with performance caching.
 *
 * @public
 * @since 3.0.0
 */
export class SchemaValidatorFactory {
  private static validators: SchemaValidator[] = []

  /**
   * Register a schema validator.
   *
   * @param validator - The validator to register.
   */
  static register(validator: SchemaValidator): void {
    this.validators.push(validator)
  }

  /**
   * Get appropriate validator for a schema with performance caching.
   *
   * This method now uses SchemaCache for significant performance improvements
   * on repeated validations with the same schema objects.
   *
   * @param schema - The schema to find validator for.
   * @returns The appropriate validator.
   * @throws Error if no suitable validator is found.
   */
  static getValidator(schema: unknown): SchemaValidator {
    // Import SchemaCache lazily to avoid circular dependency
    const { SchemaCache } = require('../core/SchemaCache')

    // Delegate to cached implementation
    return SchemaCache.getValidator(schema)
  }

  /**
   * Get all registered validators (used by SchemaCache).
   * @internal
   */
  static getValidators(): SchemaValidator[] {
    return [...this.validators]
  }
}
