/**
 * Validation Schema Metadata Extractor
 *
 * Converts backend validation schemas (Zod, Valibot, etc.) into serializable JSON metadata format.
 * This allows the frontend to obtain validation rules, ensuring consistency between frontend and backend validation logic and avoiding duplicate definitions.
 *
 * Typical usage scenarios:
 * - **Dynamic Form Generation**: Automatically generate form fields and validation rules on the frontend based on the blueprint.
 * - **Real-time Validation**: Provide instant validation feedback as users type.
 * - **API Documentation**: Automatically generate specification documents for API request parameters.
 * - **Test Data Generation**: Generate test data that complies with specifications based on schema rules.
 *
 * Design Philosophy:
 * - **Non-intrusive**: No need to modify existing schema definitions.
 * - **Lightweight**: Only extract necessary metadata, keeping the payload small.
 * - **Extensible**: Easy to add support for other validation libraries.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { BlueprintGenerator } from '@gravito/impulse'
 *
 * const schema = z.object({
 *   name: z.string().min(2).max(50),
 *   email: z.string().email(),
 *   age: z.number().int().min(18)
 * })
 *
 * const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')
 * // Returns:
 * // {
 * //   source: 'json',
 * //   rules: {
 * //     name: { type: 'string', required: true, min: 2, max: 50 },
 * //     email: { type: 'string', required: true, format: 'email' },
 * //     age: { type: 'number', required: true, min: 18, integer: true }
 * //   }
 * // }
 * ```
 */
export class BlueprintGenerator {
  /**
   * Check if a schema is a Zod schema
   *
   * Uses duck typing to determine this by checking for characteristic properties of a Zod schema.
   * This approach avoids a direct dependency on the Zod package, keeping the library lightweight.
   *
   * @param schema - The schema object to check
   * @returns Whether it is a Zod schema
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const zodSchema = z.string()
   * BlueprintGenerator.isZodSchema(zodSchema)  // true
   *
   * const plainObject = { type: 'string' }
   * BlueprintGenerator.isZodSchema(plainObject)  // false
   * ```
   */
  static isZodSchema(schema: unknown): boolean {
    return (
      schema !== null &&
      typeof schema === 'object' &&
      '_def' in schema &&
      typeof (schema as any)._def === 'object' &&
      'shape' in (schema as any)._def
    )
  }

  /**
   * Extract metadata from a validation schema
   *
   * Parses the internal structure of a schema, extracting validation rules, type information, and constraints for each field.
   * Currently supports Zod schemas, with plans to extend support to other validation libraries in the future.
   *
   * Extracted metadata includes:
   * - Field type (string, number, boolean, enum, array, etc.)
   * - Whether it is required
   * - Length/value constraints (min, max)
   * - Format requirements (email, url, regex, etc.)
   * - Default value (default)
   *
   * @param schema - The validation schema object
   * @param source - Data source type (json, form, query, param)
   * @returns A Blueprint object containing the data source and validation rules for all fields
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const userSchema = z.object({
   *   name: z.string().min(2),
   *   email: z.string().email(),
   *   age: z.number().int().optional(),
   *   role: z.enum(['user', 'admin']).default('user')
   * })
   *
   * const blueprint = BlueprintGenerator.generateBlueprint(userSchema, 'json')
   *
   * // The frontend can use this blueprint to validate form input
   * function validateField(fieldName: string, value: any) {
   *   const rule = blueprint.rules[fieldName]
   *   if (rule.required && !value) {
   *     return 'This field is required'
   *   }
   *   if (rule.type === 'string' && rule.min && value.length < rule.min) {
   *     return `Minimum ${rule.min} characters required`
   *   }
   *   // ...more validation logic
   * }
   * ```
   */
  static generateBlueprint(schema: unknown, source: string): Record<string, any> {
    const blueprint: Record<string, any> = {
      source,
      rules: {},
    }

    if (this.isZodSchema(schema)) {
      const def = (schema as any)._def
      if (def?.shape) {
        const shape = def.shape()
        for (const [key, field] of Object.entries(shape)) {
          blueprint.rules[key] = this.parseZodField(field)
        }
      }
    }

    return blueprint
  }

  /**
   * Parse metadata for a single Zod field
   *
   * Recursively unwraps the Zod schema's wrapping layers (such as optional, nullable, default), extracting core type information and validation rules.
   *
   * Supported Zod types:
   * - ZodString: Extracts rules like min, max, email, url, regex, etc.
   * - ZodNumber: Extracts rules like min, max, int, etc.
   * - ZodBoolean: Boolean values.
   * - ZodEnum: Extracts a list of optional values.
   * - ZodArray: Recursively parses array element types.
   * - ZodOptional: Marks as not required.
   * - ZodNullable: Marks as nullable.
   * - ZodDefault: Extracts default value.
   *
   * @param field - Zod schema field object
   * @returns Metadata object for the field
   *
   * @internal
   */
  private static parseZodField(field: any): any {
    const metadata: any = { type: 'string', required: true }
    let current = field

    // Unwrap optional/nullable/default
    while (current._def) {
      const def = current._def
      const typeName = def.typeName

      if (typeName === 'ZodOptional') {
        metadata.required = false
        current = def.innerType
      } else if (typeName === 'ZodNullable') {
        metadata.nullable = true
        current = def.innerType
      } else if (typeName === 'ZodDefault') {
        metadata.default = def.defaultValue()
        metadata.required = false
        current = def.innerType
      } else if (typeName === 'ZodString') {
        metadata.type = 'string'
        def.checks?.forEach((check: any) => {
          if (check.kind === 'min') {
            metadata.min = check.value
          }
          if (check.kind === 'max') {
            metadata.max = check.value
          }
          if (check.kind === 'email') {
            metadata.format = 'email'
          }
          if (check.kind === 'url') {
            metadata.format = 'url'
          }
          if (check.kind === 'regex') {
            metadata.pattern = check.regex.source
          }
        })
        break
      } else if (typeName === 'ZodNumber') {
        metadata.type = 'number'
        def.checks?.forEach((check: any) => {
          if (check.kind === 'min') {
            metadata.min = check.value
          }
          if (check.kind === 'max') {
            metadata.max = check.value
          }
          if (check.kind === 'int') {
            metadata.integer = true
          }
        })
        break
      } else if (typeName === 'ZodBoolean') {
        metadata.type = 'boolean'
        break
      } else if (typeName === 'ZodEnum') {
        metadata.type = 'enum'
        metadata.options = def.values
        break
      } else if (typeName === 'ZodArray') {
        metadata.type = 'array'
        metadata.items = this.parseZodField(def.type)
        break
      } else {
        break
      }
    }

    return metadata
  }
}
