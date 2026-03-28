import type { z } from 'zod'
import { ImpulseError } from '../errors/ImpulseError'
import { ImpulseErrorCodes } from '../errors/codes'
import { type SchemaValidationResult, SchemaValidator } from './SchemaValidator'

let SchemaCompilationCache: any
function getSchemaCompilationCache() {
  if (!SchemaCompilationCache) {
    const { SchemaCompilationCache: Cache } = require('../core/SchemaCompilationCache')
    SchemaCompilationCache = Cache
  }
  return SchemaCompilationCache
}

/**
 * Zod schema validator implementation.
 *
 * Handles validation for Zod schemas using the safeParse method.
 * Provides consistent error formatting for the FormRequest system.
 *
 * @public
 * @since 3.0.0
 */
export class ZodValidator extends SchemaValidator {
  /**
   * Check if schema is Zod-like by looking for safeParse method.
   *
   * @param schema - The schema to check.
   * @returns True if schema appears to be a Zod schema.
   */
  canHandle(schema: unknown): schema is z.ZodType {
    return (
      schema !== null &&
      typeof schema === 'object' &&
      'safeParse' in schema &&
      typeof (schema as { safeParse: unknown }).safeParse === 'function'
    )
  }

  /**
   * Validate data with Zod schema using compilation cache.
   *
   * @param schema - The Zod schema to validate against.
   * @param data - The data to validate.
   * @returns Promise resolving to validation result.
   */
  async validate(schema: unknown, data: unknown): Promise<SchemaValidationResult> {
    if (!this.canHandle(schema)) {
      throw new ImpulseError(
        ImpulseErrorCodes.INVALID_SCHEMA,
        'Invalid schema provided to ZodValidator'
      )
    }

    const compilationCache = getSchemaCompilationCache()
    const zodSchema = schema as z.ZodType

    // Use SchemaCompilationCache.getCompiledValidator API
    const validator = compilationCache.getCompiledValidator(zodSchema, () =>
      compilationCache.compileZodValidator(zodSchema)
    )

    return await validator.validate(data)
  }
}
