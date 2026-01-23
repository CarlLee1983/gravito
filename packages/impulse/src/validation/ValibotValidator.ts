import { type SchemaValidationResult, SchemaValidator } from './SchemaValidator'

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
      ('_run' in schema || ('parse' in schema && !('safeParse' in schema)))
    )
  }

  /**
   * Validate data with Valibot schema.
   *
   * @param schema - The Valibot schema to validate against.
   * @param data - The data to validate.
   * @returns Promise resolving to validation result.
   */
  async validate(schema: unknown, data: unknown): Promise<SchemaValidationResult> {
    if (!this.canHandle(schema)) {
      throw new Error('Invalid schema provided to ValibotValidator')
    }

    const valibotSchema = schema as ValibotLikeSchema

    try {
      // Try using _run for Valibot v1+
      if (valibotSchema._run) {
        const result = valibotSchema._run({ typed: false, value: data }, {})
        if (!result.issues || result.issues.length === 0) {
          return { success: true, data }
        }
        return {
          success: false,
          errors: result.issues.map((issue) => ({
            path: issue.path?.map((p) => p.key) ?? [],
            message: issue.message,
            code: issue.type,
          })),
        }
      }

      // Fallback to parse (throws on error)
      if (valibotSchema.parse) {
        const validatedData = valibotSchema.parse(data)
        return { success: true, data: validatedData }
      }

      return {
        success: false,
        errors: [{ path: [], message: 'Invalid schema' }],
      }
    } catch (err: unknown) {
      const error = err as {
        issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }>
      }

      if (error.issues) {
        return {
          success: false,
          errors: error.issues.map((issue) => ({
            path: issue.path?.map((p) => p.key) ?? [],
            message: issue.message,
            code: issue.type,
          })),
        }
      }

      return {
        success: false,
        errors: [{ path: [], message: String(err) }],
      }
    }
  }
}
