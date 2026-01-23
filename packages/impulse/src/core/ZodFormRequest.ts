import type { Context } from '@gravito/core/compat'
import type { z } from 'zod'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Zod-specific FormRequest implementation with full type inference.
 *
 * Use this class when you want complete TypeScript type safety with Zod schemas.
 * The validated data will be automatically typed based on your schema.
 *
 * @example
 * ```typescript
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 * }
 * // ctx.get('validated') is now { name: string; email: string }
 * ```
 *
 * @public
 * @since 3.1.0
 */
export abstract class ZodFormRequest<TSchema extends z.ZodType = z.ZodType> extends FormRequestBase<
  z.infer<TSchema>
> {
  /**
   * The Zod schema for validation.
   * Define this in your concrete class.
   */
  abstract readonly schema: TSchema

  /**
   * Validate data against the Zod schema with full type inference.
   *
   * @param ctx - The request context
   * @returns Promise resolving to typed validation result
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
   * Generate validation metadata blueprint for frontend use.
   *
   * @returns Structured metadata object representing the schema
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
