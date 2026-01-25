import type { Context } from '@gravito/core/compat'
import type { z } from 'zod'
import { SchemaValidatorFactory } from '../validation'
import { BlueprintGenerator } from './BlueprintGenerator'
import { FormRequestBase } from './FormRequestBase'
import type { ValidationResult } from './TypeUtils'

/**
 * 基於 Zod 的 FormRequest 實作
 *
 * 專為 Zod schema 驗證函式庫設計的 FormRequest 類別，提供完整的 TypeScript 型別推論。
 * 驗證後的資料會自動獲得基於 schema 定義的精確型別，無需手動標註。
 *
 * 適用場景：
 * - 需要強大的 TypeScript 型別安全
 * - 偏好 Zod 的鏈式 API 語法
 * - 需要複雜的驗證規則（如條件驗證、資料轉換）
 * - 專案已使用 Zod 作為主要驗證函式庫
 *
 * @typeParam TSchema - Zod schema 類型，預設為 `z.ZodType`
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { ZodFormRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * // 定義驗證 schema
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     name: z.string().min(2, '名稱至少需要 2 個字元'),
 *     email: z.string().email('請輸入有效的電子郵件'),
 *     age: z.number().int().min(18, '必須年滿 18 歲'),
 *     role: z.enum(['user', 'admin']).default('user')
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
 *   // data 的型別自動推論為:
 *   // { name: string; email: string; age: number; role: 'user' | 'admin' }
 * })
 * ```
 */
export abstract class ZodFormRequest<TSchema extends z.ZodType = z.ZodType> extends FormRequestBase<
  z.infer<TSchema>
> {
  /**
   * Zod 驗證 schema
   *
   * 在子類別中定義此屬性來指定驗證規則。
   * TypeScript 會自動從 schema 推論出驗證後的資料型別。
   */
  abstract readonly schema: TSchema

  /**
   * 使用 Zod schema 驗證請求資料
   *
   * 執行完整的驗證流程，包括授權檢查、資料提取、轉換和 schema 驗證。
   * 驗證成功時返回型別安全的資料，失敗時返回詳細的錯誤資訊。
   *
   * @param ctx - 請求 context 物件
   * @returns 型別安全的驗證結果，成功時包含 `z.infer<TSchema>` 型別的資料
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const result = await request.validate(ctx)
   *
   * if (result.success) {
   *   // result.data 的型別是 { name: string; email: string; ... }
   *   console.log('驗證成功:', result.data)
   * } else {
   *   // 處理驗證錯誤
   *   console.error('驗證失敗:', result.error)
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
   * 產生前端可用的驗證 schema 元資料
   *
   * 將 Zod schema 轉換為 JSON 格式的元資料，讓前端能夠實現相同的驗證規則。
   * 這確保了前後端驗證邏輯的一致性，避免重複定義。
   *
   * @returns 結構化的 schema 元資料物件
   *
   * @example
   * ```typescript
   * const request = new CreateUserRequest()
   * const blueprint = request.getBlueprint()
   *
   * // 在 API 端點中提供 blueprint
   * app.get('/api/users/validation-blueprint', (ctx) => {
   *   return ctx.json(blueprint)
   * })
   *
   * // 前端可使用此 blueprint 來實現即時驗證
   * ```
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}
