import type { Context } from '@gravito/core/compat'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * Valibot-like schema 介面（用於鴨子型別）
 *
 * 使用鴨子型別來支援 Valibot，避免直接依賴 Valibot 套件。
 * 只要物件實作了這些方法，就會被視為 Valibot schema。
 *
 * 這種設計讓套件保持輕量，使用者可以選擇是否安裝 Valibot。
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * 基於 Valibot 的 FormRequest 實作
 *
 * 專為 Valibot schema 驗證函式庫設計的 FormRequest 類別，提供型別推論支援。
 * Valibot 以其輕量級和模組化設計而聞名，非常適合追求小包體積的專案。
 *
 * 適用場景：
 * - 需要最小的包體積（Valibot 通常比 Zod 小 10 倍以上）
 * - 偏好函數式程式設計風格
 * - 需要樹搖優化（tree-shaking）
 * - 專案已使用 Valibot 作為主要驗證函式庫
 *
 * @typeParam TData - 驗證後的資料型別，需要手動指定或從 Valibot 的 `InferOutput` 推論
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { ValibotFormRequest } from '@gravito/impulse'
 * import * as v from 'valibot'
 *
 * // 定義驗證 schema
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
 * // 在路由中使用
 * app.post('/users', validateRequest(CreateUserRequest), (ctx) => {
 *   const data = ctx.get('validated')
 *   // 使用驗證後的資料
 * })
 * ```
 */
export abstract class ValibotFormRequest<TData = unknown> extends FormRequestBase<TData> {
  /**
   * Valibot 驗證 schema
   *
   * 在子類別中定義此屬性來指定驗證規則。
   * 使用 Valibot 的管道（pipe）語法來組合驗證器。
   */
  abstract readonly schema: ValibotLikeSchema

  /**
   * 使用 Valibot schema 驗證請求資料
   *
   * 執行完整的驗證流程，包括授權檢查、資料提取、轉換和 schema 驗證。
   * 驗證成功時返回型別安全的資料，失敗時返回詳細的錯誤資訊。
   *
   * @param ctx - 請求 context 物件
   * @returns 型別安全的驗證結果，成功時包含 `TData` 型別的資料
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const result = await request.validate(ctx)
   *
   * if (result.success) {
   *   console.log('驗證成功:', result.data)
   * } else {
   *   console.error('驗證失敗:', result.error)
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
   * 產生前端可用的驗證 schema 元資料
   *
   * 將 Valibot schema 轉換為 JSON 格式的元資料，讓前端能夠實現相同的驗證規則。
   * 確保前後端驗證邏輯的一致性，提升使用者體驗。
   *
   * @returns 結構化的 schema 元資料物件
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const blueprint = request.getBlueprint()
   *
   * // 提供給前端使用
   * app.get('/api/users/validation-blueprint', (ctx) => {
   *   return ctx.json(blueprint)
   * })
   * ```
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
