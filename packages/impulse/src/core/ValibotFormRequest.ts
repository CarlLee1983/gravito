import type { Context } from '@gravito/core/compat'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Valibot-like schema interface (for duck typing)
 *
 * Uses duck typing to support Valibot, avoiding a direct dependency on the Valibot package.
 * Any object that implements these methods will be treated as a Valibot schema.
 *
 * This design keeps the package lightweight and allows users to choose whether or not to install Valibot.
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * Valibot-based FormRequest implementation
 *
 * A FormRequest class specifically designed for the Valibot schema validation library, providing support for type inference.
 * Valibot is known for its lightweight and modular design, making it ideal for projects seeking small bundle sizes.
 *
 * Suitable Scenarios:
 * - Requirement for minimal bundle size (Valibot is typically more than 10 times smaller than Zod).
 * - Preference for functional programming style.
 * - Requirement for tree-shaking optimization.
 * - Project already uses Valibot as the primary validation library.
 *
 * @typeParam TData - The type of data after validation, which needs to be manually specified or inferred from Valibot's `InferOutput`.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { ValibotFormRequest } from '@gravito/impulse'
 * import * as v from 'valibot'
 *
 * // Define validation schema
 * class CreateUserRequest extends ValibotFormRequest {
 *   schema = v.object({
 *     name: v.pipe(v.string(), v.minLength(2)),
 *     email: v.pipe(v.string(), v.email()),
 *     age: v.pipe(v.number(), v.minValue(18)),
 *     role: v.optional(v.picklist(['user', 'admin']), 'user')
 *   })
 *
 *   authorize(ctx: Context) {
 *     return ctx.get('user')?.role === 'admin'
 *   }
 * }
 *
 * // Use in routes
 * app.post('/users', validateRequest(CreateUserRequest), (ctx) => {
 *   const data = ctx.get('validated')
 *   // Use the validated data
 * })
 * ```
 */
export abstract class ValibotFormRequest<TData = unknown> extends FormRequestBase<TData> {
  /**
   * Valibot validation schema
   *
   * Define this property in subclasses to specify validation rules.
   * Use Valibot's pipe syntax to compose validators.
   */
  abstract readonly schema: ValibotLikeSchema

  /**
   * Validate request data using a Valibot schema
   *
   * Executes the full validation process, including authorization check, data extraction, transformation, and schema validation.
   * Returns type-safe data on successful validation, or detailed error information on failure.
   *
   * @param ctx - Request context object
   * @returns Type-safe validation result; contains data of type `TData` on success
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const result = await request.validate(ctx)
   *
   * if (result.success) {
   *   console.log('Validation successful:', result.data)
   * } else {
   *   console.error('Validation failed:', result.error)
   * }
   * ```
   */
  async validate(ctx: Context): Promise<ValidationResult<TData>> {
    // Check authorization first
    if (this.authorize && !(await this.authorize(ctx))) {
      const message =
        this.authorizationMessage?.() ??
        this.options.messageProvider?.getUnauthorizedMessage() ??
        'Unauthorized'

      return {
        success: false,
        error: {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message,
            details: [],
          },
        },
      }
    }

    try {
      // Get raw data from context
      let data = await this.getData(ctx)

      // Apply transformation if provided
      if (this.transform) {
        data = this.transform(data)
      }

      // Get the validator and validate
      const validator = SchemaValidatorFactory.getValidator(this.schema)
      const result = await validator.validate(this.schema, data)

      if (!result.success) {
        // Map validation errors with custom messages
        const details = (result.errors || []).map((error) => {
          const field = error.path.join('.')
          const message = this.getErrorMessage(field, error.code, error.message)

          return {
            field,
            message,
            code: error.code || undefined,
          }
        })

        const errorMessage =
          this.options.messageProvider?.getValidationFailedMessage() ?? 'Validation failed'

        return {
          success: false,
          error: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: errorMessage,
              details,
            },
          },
        }
      }

      // Return typed success result
      return {
        success: true,
        data: result.data as TData,
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage =
        this.options.messageProvider?.getValidationFailedMessage() ?? 'Validation failed'

      return {
        success: false,
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            details: [
              {
                field: 'general',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            ],
          },
        },
      }
    }
  }

  /**
   * Generate validation schema metadata for frontend use
   *
   * Converts the Valibot schema into JSON-formatted metadata, allowing the frontend to implement the same validation rules.
   * Ensures consistency between frontend and backend validation logic and improves user experience.
   *
   * @returns A structured schema metadata object
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const blueprint = request.getBlueprint()
   *
   * // Provide to frontend
   * app.get('/api/users/validation-blueprint', (ctx) => {
   *   return ctx.json(blueprint)
   * })
   * ```
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
