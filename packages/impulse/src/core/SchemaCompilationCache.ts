/**
 * Schema validation result interface.
 */
interface SchemaValidationResult {
  success: boolean
  data?: unknown
  errors?: Array<{
    path: string[]
    message: string
    code?: string | undefined
  }>
}

/**
 * Compiled validator function with cached metadata.
 */
interface CompiledValidator {
  validate: (data: unknown) => Promise<SchemaValidationResult>
  schemaType: 'zod' | 'valibot'
  compiledAt: number
}

/**
 * Performance optimization utility for schema compilation caching.
 *
 * Caches compiled/optimized schema validation functions to avoid repeated
 * schema compilation overhead in validation hot paths.
 *
 * @public
 * @since 3.1.0
 */
export class SchemaCompilationCache {
  /**
   * WeakMap cache for compiled validation functions keyed by schema objects.
   * Using WeakMap prevents memory leaks as schemas can be garbage collected.
   */
  private static compilationCache = new WeakMap<object, CompiledValidator>()

  /**
   * Get cached compiled validator for a schema.
   *
   * This method provides significant performance improvements for repeated
   * validations with the same schema by avoiding recompilation overhead.
   *
   * @param schema - The schema to compile/cache
   * @param compiler - Function to compile the schema if not cached
   * @returns Cached or newly compiled validator function
   */
  static getCompiledValidator(
    schema: object,
    compiler: () => CompiledValidator
  ): CompiledValidator {
    // Check cache first (WeakMap lookup is O(1))
    let compiled = this.compilationCache.get(schema)

    if (!compiled) {
      // Cache miss: compile and cache
      compiled = compiler()
      this.compilationCache.set(schema, compiled)
    }

    return compiled
  }

  /**
   * Create a compiled validator function for Zod schemas.
   *
   * @param schema - Zod schema to compile
   * @returns Compiled validator function
   */
  static compileZodValidator(schema: any): CompiledValidator {
    // Pre-bind the safeParse method for better performance
    const boundSafeParse = schema.safeParse.bind(schema)

    return {
      async validate(data: unknown): Promise<SchemaValidationResult> {
        const result = boundSafeParse(data)

        if (result.success) {
          return { success: true, data: result.data }
        }

        return {
          success: false,
          errors: result.error.errors.map((err: any) => ({
            path: err.path.map(String),
            message: err.message,
            code: err.code,
          })),
        }
      },
      schemaType: 'zod' as const,
      compiledAt: Date.now(),
    }
  }

  /**
   * Create a compiled validator function for Valibot schemas.
   *
   * @param schema - Valibot schema to compile
   * @returns Compiled validator function
   */
  static compileValibotValidator(schema: any): CompiledValidator {
    // Standard Schema support (Valibot v1+)
    if ('~standard' in schema) {
      const standard = schema['~standard']
      return {
        async validate(data: unknown): Promise<SchemaValidationResult> {
          const result = await standard.validate(data)
          if (result.issues) {
            return {
              success: false,
              errors: result.issues.map((issue: any) => ({
                path: issue.path?.map((p: any) => p.key || p) ?? [],
                message: issue.message,
                code: issue.type,
              })),
            }
          }
          return { success: true, data: result.value }
        },
        schemaType: 'valibot' as const,
        compiledAt: Date.now(),
      }
    }

    // Pre-determine which validation method to use for better performance
    const useRun = schema._run && typeof schema._run === 'function'
    const useParse = schema.parse && typeof schema.parse === 'function'

    if (useRun) {
      const boundRun = schema._run.bind(schema)

      return {
        async validate(data: unknown): Promise<SchemaValidationResult> {
          try {
            const result = boundRun({ typed: false, value: data }, {})
            if (!result.issues || result.issues.length === 0) {
              return { success: true, data }
            }
            return {
              success: false,
              errors: result.issues.map((issue: any) => ({
                path: issue.path?.map((p: any) => p.key) ?? [],
                message: issue.message,
                code: issue.type,
              })),
            }
          } catch (err) {
            return {
              success: false,
              errors: [{ path: [], message: String(err) }],
            }
          }
        },
        schemaType: 'valibot' as const,
        compiledAt: Date.now(),
      }
    }

    if (useParse) {
      const boundParse = schema.parse.bind(schema)

      return {
        async validate(data: unknown): Promise<SchemaValidationResult> {
          try {
            const validatedData = boundParse(data)
            return { success: true, data: validatedData }
          } catch (err: any) {
            if (err.issues) {
              return {
                success: false,
                errors: err.issues.map((issue: any) => ({
                  path: issue.path?.map((p: any) => p.key) ?? [],
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
        },
        schemaType: 'valibot' as const,
        compiledAt: Date.now(),
      }
    }

    throw new Error('Unsupported Valibot schema - no _run or parse method found')
  }

  /**
   * Clear the compilation cache (useful for testing).
   * In production, the WeakMap will automatically clean up when schemas are GC'd.
   */
  static clearCache(): void {
    this.compilationCache = new WeakMap<object, CompiledValidator>()
  }

  /**
   * Get cache statistics for monitoring.
   * Note: WeakMap doesn't provide size information for privacy reasons.
   */
  static getCacheStats(): {
    message: string
  } {
    return {
      message: 'Compiled validators cached (WeakMap size not exposed for privacy)',
    }
  }
}
