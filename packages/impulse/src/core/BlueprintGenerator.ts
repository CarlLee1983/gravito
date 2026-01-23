/**
 * Blueprint generator for extracting validation metadata.
 *
 * Provides metadata extraction from validation schemas to enable
 * frontend/bridge consumption without code duplication.
 *
 * @public
 * @since 3.0.0
 */
export class BlueprintGenerator {
  /**
   * Check if schema is Zod-like by looking for _def property and shape method.
   *
   * @param schema - The schema to check.
   * @returns True if schema appears to be a Zod schema with extractable metadata.
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
   * Extract validation metadata for frontend consumption.
   *
   * @param schema - The validation schema.
   * @param source - The data source type.
   * @returns Blueprint object with rules and metadata.
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
   * Lightweight Zod field parser to extract metadata for the bridge.
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
