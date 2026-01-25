import type { Context } from '@gravito/core/compat'
import type { z } from 'zod'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Zod-based FormRequest implementation
 *
 * A FormRequest class specifically designed for the Zod schema validation library, providing complete TypeScript type inference.
 * Validated data automatically obtains the precise type based on the schema definition, without the need for manual annotation.
 *
 * Suitable Scenarios:
 * - Requirement for strong TypeScript type safety.
 * - Preference for Zod's chainable API syntax.
 * - Requirement for complex validation rules (e.g., conditional validation, data transformation).
 * - Project already uses Zod as the primary validation library.
 *
 * @typeParam TSchema - Zod schema type, defaults to `z.ZodType`.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { ZodFormRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * // Define validation schema
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     name: z.string().min(2, 'Name must be at least 2 characters'),
 *     email: z.string().email('Please enter a valid email address'),
 *     age: z.number().int().min(18, 'Must be at least 18 years old'),
 *     role: z.enum(['user', 'admin']).default('user')
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
 *   // The type of data is automatically inferred as:
 *   // { name: string; email: string; age: number; role: 'user' | 'admin' }
 * })
 * ```
 */
export abstract class ZodFormRequest<TSchema extends z.ZodType = z.ZodType> extends FormRequestBase<
  z.infer<TSchema>
> {
  /**
   * Zod validation schema
   *
   * Define this property in subclasses to specify validation rules.
   * TypeScript will automatically infer the validated data type from the schema.
   */
  abstract readonly schema: TSchema

  /**
   * Validate request data using a Zod schema
   *
   * Executes the full validation process, including authorization check, data extraction, transformation, and schema validation.
   * Returns type-safe data on successful validation, or detailed error information on failure.
   *
   * @param ctx - Request context object
   * @returns Type-safe validation result; contains data of type `z.infer<TSchema>` on success
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const result = await request.validate(ctx)
   *
   * if (result.success) {
   *   // result.data type is { name: string; email: string; ... }
   *   console.log('Validation successful:', result.data)
   * } else {
   *   // Handle validation error
   *   console.error('Validation failed:', result.error)
   * }
   * ```
   */
  async validate(ctx: Context): Promise<ValidationResult<z.infer<TSchema>>> {
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
        data: result.data as z.infer<TSchema>,
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
   * Converts the Zod schema into JSON-formatted metadata, allowing the frontend to implement the same validation rules.
   * This ensures consistency between frontend and backend validation logic and avoids duplicate definitions.
   *
   * @returns A structured schema metadata object
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const blueprint = request.getBlueprint()
   *
   * // Provide the blueprint in an API endpoint
   * app.get('/api/users/validation-blueprint', (ctx) => {
   *   return ctx.json(blueprint)
   * })
   *
   * // The frontend can use this blueprint to implement real-time validation
   * ```
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
