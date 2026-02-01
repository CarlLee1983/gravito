import type { Context } from '@gravito/core/compat'
import type { z } from 'zod'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Zod-based implementation of FormRequest.
 *
 * Leverages Zod's powerful schema definition and type inference to provide
 * a fully type-safe validation experience.
 *
 * @typeParam TSchema - The Zod schema type.
 * @public
 *
 * @example
 * ```typescript
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     username: z.string().min(3),
 *     email: z.string().email()
 *   })
 * }
 * ```
 */
export abstract class ZodFormRequest<TSchema extends z.ZodType = z.ZodType> extends FormRequestBase<
  z.infer<TSchema>
> {
  /**
   * The Zod schema used for validation.
   */
  abstract readonly schema: TSchema

  /**
   * Validates the request context against the Zod schema.
   *
   * @param ctx - The request context.
   * @param options - Validation options, including partial validation support.
   * @returns A result object containing either validated data or error details.
   */
  async validate(
    ctx: Context,
    options: { partial?: boolean } = {}
  ): Promise<ValidationResult<z.infer<TSchema>>> {
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
      let data = await this.getData(ctx)

      if (this.transform) {
        data = this.transform(data)
      }

      let schema = this.schema
      if (options.partial && typeof (schema as any).partial === 'function') {
        schema = (schema as any).partial()
      }

      const validator = SchemaValidatorFactory.getValidator(schema)
      const result = await validator.validate(schema, data)

      if (!result.success) {
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

      return {
        success: true,
        data: result.data as z.infer<TSchema>,
      }
    } catch (error) {
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
   * Generates a serializable blueprint of the Zod schema.
   *
   * @returns A JSON-serializable object representing the schema.
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
