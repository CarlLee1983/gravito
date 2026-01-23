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
 * Valibot-like schema interface (for duck-typing).
 *
 * Supports both v1+ (_run method) and legacy (parse method) APIs.
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * Valibot schema validator implementation.
 *
 * Handles validation for Valibot schemas using duck-typing to support
 * both v1+ (_run method) and legacy (parse method) APIs.
 *
 * @public
 * @since 3.0.0
 */
export class ValibotValidator extends SchemaValidator {
  /**
   * Check if schema is Valibot-like by looking for _run or parse methods.
   *
   * @param schema - The schema to check.
   * @returns True if schema appears to be a Valibot schema.
   */
  canHandle(schema: unknown): schema is ValibotLikeSchema {
    return (
      schema !== null &&
      typeof schema === 'object' &&
      ('_run' in schema || ('parse' in schema && !('safeParse' in schema)) || '~standard' in schema)
    )
  }

  /**
   * Validate data with Valibot schema using compilation cache.
   *
   * @param schema - The Valibot schema to validate against.
   * @param data - The data to validate.
   * @returns Promise resolving to validation result.
   */
  async validate(schema: unknown, data: unknown): Promise<SchemaValidationResult> {
    if (!this.canHandle(schema)) {
      throw new Error('Invalid schema provided to ValibotValidator')
    }

    const compilationCache = getSchemaCompilationCache()
    const valibotSchema = schema as ValibotLikeSchema

    // Use SchemaCompilationCache.getCompiledValidator API
    const validator = compilationCache.getCompiledValidator(valibotSchema, () =>
      compilationCache.compileValibotValidator(valibotSchema)
    )

    return await validator.validate(data)
  }
}
