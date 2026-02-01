import type { Context } from '@gravito/core/compat'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Duck-typed interface for Valibot schemas.
 *
 * Allows Impulse to support Valibot without a direct dependency on the package.
 *
 * @internal
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * Valibot-based implementation of FormRequest.
 *
 * Provides a lightweight validation mechanism using Valibot's modular architecture.
 *
 * @typeParam TData - The type of data after validation.
 * @public
 *
 * @example
 * ```typescript
 * class CreateUserRequest extends ValibotFormRequest {
 *   schema = v.object({
 *     name: v.string(),
 *     email: v.pipe(v.string(), v.email())
 *   })
 * }
 * ```
 */
export abstract class ValibotFormRequest<TData = unknown> extends FormRequestBase<TData> {
  /**
   * The Valibot schema used for validation.
   */
  abstract readonly schema: ValibotLikeSchema

  /**
   * Validates the request context against the Valibot schema.
   *
   * @param ctx - The request context.
   * @param options - Validation options.
   * @returns A result object containing either validated data or error details.
   */
  async validate(
    ctx: Context,
    options: { partial?: boolean } = {}
  ): Promise<ValidationResult<TData>> {
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
        data: result.data as TData,
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
   * Generates a serializable blueprint of the Valibot schema.
   *
   * @returns A JSON-serializable object representing the schema.
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
