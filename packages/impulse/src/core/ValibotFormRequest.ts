import type { Context } from '@gravito/core/compat'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Valibot-like schema interface (for duck-typing).
 *
 * This interface allows us to support Valibot without direct dependency,
 * using duck-typing to detect Valibot schemas.
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * Valibot-specific FormRequest implementation with type inference.
 *
 * Use this class when you want TypeScript type safety with Valibot schemas.
 * The validated data will be typed based on your schema inference.
 *
 * @example
 * ```typescript
 * import * as v from 'valibot'
 *
 * class CreateUserRequest extends ValibotFormRequest {
 *   schema = v.object({
 *     name: v.pipe(v.string(), v.minLength(2)),
 *     email: v.pipe(v.string(), v.email()),
 *   })
 * }
 * // ctx.get('validated') will be properly typed
 * ```
 *
 * @public
 * @since 3.1.0
 */
export abstract class ValibotFormRequest<TData = unknown> extends FormRequestBase<TData> {
  /**
   * The Valibot schema for validation.
   * Define this in your concrete class.
   */
  abstract readonly schema: ValibotLikeSchema

  /**
   * Validate data against the Valibot schema with type inference.
   *
   * @param ctx - The request context
   * @returns Promise resolving to typed validation result
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
   * Generate validation metadata blueprint for frontend use.
   *
   * @returns Structured metadata object representing the schema
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
