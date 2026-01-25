import type { ContentfulStatusCode } from '@gravito/core'
import { AuthorizationException, ValidationException } from '@gravito/core'
import type { Context, MiddlewareHandler } from '@gravito/core/compat'
import type { z } from 'zod'
import { BlueprintGenerator } from './core/BlueprintGenerator'
// Import extracted components
import { DataExtractor, type DataSource } from './core/DataExtractor'
import { type SchemaValidationResult, SchemaValidatorFactory } from './validation/SchemaValidator'
// Initialize validators (this must happen for the factory to work)
import './validation/index'

/**
 * 單一欄位的驗證錯誤詳細資訊
 *
 * 用於結構化表示每個欄位的驗證失敗原因，讓前端能夠精確地在對應欄位旁顯示錯誤訊息。
 * 使用點記號路徑（如 'user.email'）來表示嵌套物件中的欄位位置。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const error: ValidationErrorDetail = {
 *   field: 'user.email',
 *   message: '電子郵件格式不正確',
 *   code: 'invalid_string'
 * }
 * ```
 */
export interface ValidationErrorDetail {
  /** 發生錯誤的欄位名稱（使用點記號表示嵌套路徑） */
  field: string
  /** 人類可讀的錯誤訊息 */
  message: string
  /** 機器可讀的錯誤代碼，用於程式化處理（例如 'too_small'） */
  code?: string | undefined
}

/**
 * 結構化的驗證錯誤回應格式
 *
 * 提供統一的 API 錯誤回應格式，讓前端能夠一致地處理驗證失敗和授權失敗的情況。
 * 遵循 REST API 最佳實踐，將錯誤資訊結構化為可程式化處理的格式。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const response: ValidationErrorResponse = {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: '驗證失敗',
 *     details: [
 *       { field: 'email', message: '電子郵件格式不正確', code: 'invalid_string' }
 *     ]
 *   }
 * }
 * ```
 */
export interface ValidationErrorResponse {
  /** 錯誤回應時始終為 false，用於統一的回應格式判斷 */
  success: false
  /** 錯誤資訊容器 */
  error: {
    /** 高階錯誤類型代碼，用於區分驗證錯誤和授權錯誤 */
    code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR'
    /** 通用錯誤訊息摘要 */
    message: string
    /** 欄位級別的詳細驗證錯誤陣列 */
    details: ValidationErrorDetail[]
  }
}

/**
 * Data source for validation.
 *
 * @public
 * @since 3.0.0
 */

/**
 * 國際化訊息提供者介面
 *
 * 用於將驗證器產生的錯誤代碼轉換為本地化的使用者友善訊息。
 * 支援多語系應用程式根據使用者語言偏好顯示適當的錯誤訊息。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * class ChineseMessageProvider implements MessageProvider {
 *   getMessage(code: string, field: string, defaultMessage: string): string {
 *     const messages = {
 *       'email.invalid_string': '電子郵件格式不正確',
 *       'name.too_small': '姓名至少需要 2 個字元'
 *     }
 *     return messages[`${field}.${code}`] ?? defaultMessage
 *   }
 *
 *   getValidationFailedMessage(): string {
 *     return '驗證失敗'
 *   }
 *
 *   getUnauthorizedMessage(): string {
 *     return '未授權'
 *   }
 * }
 * ```
 */
export interface MessageProvider {
  /**
   * 根據錯誤代碼和欄位名稱獲取本地化訊息
   *
   * @param code - 驗證器產生的錯誤代碼
   * @param field - 欄位名稱
   * @param defaultMessage - 找不到對應翻譯時的備用訊息
   * @returns 本地化的錯誤訊息
   */
  getMessage(code: string, field: string, defaultMessage: string): string
  /** 獲取通用的「驗證失敗」摘要訊息 */
  getValidationFailedMessage(): string
  /** 獲取通用的「未授權」摘要訊息 */
  getUnauthorizedMessage(): string
}

/**
 * 預設的訊息提供者實作
 *
 * 不進行任何本地化轉換，直接返回驗證器的原始英文訊息。
 * 適用於不需要國際化支援的應用程式，或作為自訂實作的參考範例。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const provider = new DefaultMessageProvider()
 * const message = provider.getMessage('invalid_string', 'email', 'Invalid email')
 * // 返回: 'Invalid email'
 * ```
 */
export class DefaultMessageProvider implements MessageProvider {
  getMessage(_code: string, _field: string, defaultMessage: string): string {
    return defaultMessage
  }
  getValidationFailedMessage(): string {
    return 'Validation failed'
  }
  getUnauthorizedMessage(): string {
    return 'Unauthorized'
  }
}

/**
 * FormRequest 的設定選項
 *
 * 允許自訂驗證行為，包括 HTTP 狀態碼和錯誤訊息本地化。
 * 這些選項讓您能夠調整 FormRequest 以符合專案的 API 設計規範。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const options: FormRequestOptions = {
 *   errorStatus: 400,  // 使用 400 而非預設的 422
 *   authErrorStatus: 401,  // 使用 401 而非預設的 403
 *   messageProvider: new ChineseMessageProvider()  // 自訂訊息提供者
 * }
 * ```
 */
export interface FormRequestOptions {
  /** 驗證錯誤時回應的 HTTP 狀態碼（預設：422 Unprocessable Entity） */
  errorStatus?: ContentfulStatusCode
  /** 授權失敗時回應的 HTTP 狀態碼（預設：403 Forbidden） */
  authErrorStatus?: ContentfulStatusCode
  /** 自訂的國際化訊息提供者，用於本地化錯誤訊息 */
  messageProvider?: MessageProvider
}

/**
 * FormRequest 驗證基礎類別
 *
 * 提供類似 Laravel FormRequest 的宣告式請求驗證機制，將驗證邏輯從控制器中分離出來。
 * 支援 Zod 和 Valibot 兩種主流的 TypeScript schema 驗證函式庫，讓您能夠選擇偏好的工具。
 *
 * 核心設計理念：
 * - **關注點分離**：驗證邏輯獨立於業務邏輯，提升程式碼可維護性
 * - **可重用性**：同一個 FormRequest 類別可在多個路由中重複使用
 * - **類型安全**：利用 TypeScript 的型別推論，驗證後的資料自動獲得正確的型別
 * - **授權整合**：可在驗證前檢查使用者是否有權限執行該操作
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // 使用 Zod
 * import { FormRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * export class StoreUserRequest extends FormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 *
 *   authorize(ctx: Context) {
 *     // 只有管理員可以建立使用者
 *     return ctx.get('user')?.role === 'admin'
 *   }
 *
 *   messages() {
 *     return {
 *       'email.invalid_string': '請輸入有效的電子郵件地址',
 *       'name.too_small': '名稱至少需要 2 個字元'
 *     }
 *   }
 * }
 *
 * // 使用 Valibot
 * import { FormRequest } from '@gravito/impulse'
 * import * as v from 'valibot'
 *
 * export class StoreUserRequest extends FormRequest {
 *   schema = v.object({
 *     name: v.pipe(v.string(), v.minLength(2)),
 *     email: v.pipe(v.string(), v.email()),
 *   })
 * }
 *
 * // 在路由中使用
 * app.post('/users', validateRequest(StoreUserRequest), async (ctx) => {
 *   const data = ctx.get('validated')  // 已驗證且型別安全的資料
 *   // ... 業務邏輯
 * })
 * ```
 */
export abstract class FormRequest<T = unknown> {
  /** 驗證 schema（Zod 或 Valibot），定義請求資料的結構和規則 */
  abstract schema: T

  /** 資料來源：'json'（請求主體）、'form'（表單資料）、'query'（查詢參數）或 'param'（路由參數） */
  source: DataSource = 'json'

  /** 設定選項，用於自訂驗證行為和錯誤處理 */
  options: FormRequestOptions = {}

  /** Data extractor instance for getting raw data from context */
  private dataExtractor = new DataExtractor()

  /**
   * 授權檢查（可選）
   *
   * 在驗證資料前先檢查使用者是否有權限執行此請求。
   * 這讓您能夠在同一個類別中整合授權邏輯，遵循「先授權，後驗證」的最佳實踐。
   *
   * @returns 返回 `true` 允許繼續驗證，返回 `false` 將拋出 403 Forbidden 錯誤
   *
   * @example
   * ```typescript
   * authorize(ctx: Context) {
   *   const user = ctx.get('user')
   *   // 只有已驗證的管理員可以執行此操作
   *   return user?.role === 'admin'
   * }
   * ```
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * 自訂授權失敗訊息（可選）
   *
   * 當 `authorize()` 返回 false 時，此方法可提供更具體的錯誤訊息。
   * 有助於向使用者解釋為何他們無權執行此操作。
   *
   * @returns 自訂的授權錯誤訊息
   *
   * @example
   * ```typescript
   * authorizationMessage() {
   *   return '只有管理員可以建立新使用者'
   * }
   * ```
   */
  authorizationMessage?(): string

  /**
   * 驗證前的資料轉換（可選）
   *
   * 在 schema 驗證之前對原始資料進行預處理。
   * 適用於型別強制轉換、添加預設值、或清理使用者輸入等情境。
   *
   * @param data - 從請求中提取的原始資料
   * @returns 轉換後的資料，將傳入 schema 進行驗證
   *
   * @example
   * ```typescript
   * transform(data: any) {
   *   return {
   *     ...data,
   *     age: data.age ? parseInt(data.age) : undefined,  // 將字串轉為數字
   *     createdAt: new Date()  // 添加時間戳記
   *   }
   * }
   * ```
   */
  transform?(data: unknown): unknown

  /**
   * 自訂錯誤訊息映射（可選）
   *
   * 定義欄位級別的自訂錯誤訊息，覆蓋 schema 驗證器的預設訊息。
   * 使用 `欄位名稱.錯誤代碼` 格式作為鍵值，提供更友善和本地化的使用者訊息。
   *
   * @returns 錯誤訊息映射物件，鍵為 `field.code` 格式，值為自訂訊息
   *
   * @example
   * ```typescript
   * messages() {
   *   return {
   *     'email.invalid_string': '請輸入有效的電子郵件地址',
   *     'name.too_small': '名稱至少需要 2 個字元',
   *     'age': '年齡必須是有效的數字'  // 也可以只用欄位名稱
   *   }
   * }
   * ```
   */
  messages?(): Record<string, string>

  /**
   * 自訂驗證失敗時的重新導向 URL（可選）
   *
   * 用於傳統的伺服器端渲染應用程式，當驗證失敗時將使用者重新導向到指定的頁面。
   * 對於 SPA 應用程式通常不需要此功能，因為錯誤會以 JSON 格式返回。
   *
   * @returns 重新導向的目標 URL
   *
   * @example
   * ```typescript
   * redirect() {
   *   return '/users/create'  // 驗證失敗時返回到建立使用者表單頁面
   * }
   * ```
   */
  redirect?(): string

  /**
   * 根據資料來源從請求 context 中提取原始資料
   *
   * 此方法會根據 `source` 屬性的設定，從不同的請求部分提取資料：
   * - `json`: 解析 JSON 請求主體
   * - `form`: 解析表單資料（FormData）
   * - `query`: 解析 URL 查詢參數
   * - `param`: 解析路由參數
   *
   * @param ctx - Gravito 請求 context 物件
   * @returns 原始資料物件，尚未經過驗證
   *
   * @example
   * ```typescript
   * const request = new StoreUserRequest()
   * request.source = 'json'
   * const rawData = await request.getData(ctx)
   * // rawData 可能是 { name: "John", email: "john@example.com" }
   * ```
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Get localized error message for a field with performance caching.
   *
   * Resolution order:
   * 1. Custom messages from messages() method (cached)
   * 2. MessageProvider (if configured)
   * 3. Default validator message
   */
  private getMessage(field: string, code: string | undefined, defaultMessage: string): string {
    // Import MessageCache lazily to avoid circular dependency
    const { MessageCache } = require('./core/MessageCache')

    // Create cache key including instance reference via constructor name
    const instanceId = this.constructor.name
    const cacheKey = MessageCache.createCacheKey(instanceId, field, code, defaultMessage)

    // Use cached message resolution
    return MessageCache.getCachedMessage(cacheKey, () => {
      // 1. Check cached custom messages from messages() method
      if (this.messages) {
        const customMessages = MessageCache.getInstanceMessages(this)
        if (customMessages) {
          const key = code ? `${field}.${code}` : field
          if (customMessages[key]) {
            return customMessages[key]
          }
          // Try field-only key
          if (customMessages[field]) {
            return customMessages[field]
          }
        }
      }

      // 2. Check i18n message provider
      if (this.options.messageProvider) {
        return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
      }

      // 3. Return default message
      return defaultMessage
    })
  }

  private getErrorMessage(field: string, code: string | undefined, message: string): string {
    return this.getMessage(field, code, message)
  }

  /**
   * 執行完整的授權和驗證流程
   *
   * 此方法是 FormRequest 的核心，按照以下順序執行：
   * 1. 檢查授權（如果有定義 `authorize` 方法）
   * 2. 從 context 中提取資料
   * 3. 執行資料轉換（如果有定義 `transform` 方法）
   * 4. 使用 schema 驗證資料
   * 5. 應用自訂錯誤訊息（如果有定義 `messages` 方法）
   *
   * 這個方法通常不需要直接呼叫，而是透過 `validateRequest()` 中介層自動執行。
   *
   * @param ctx - Gravito 請求 context 物件
   * @returns 驗證成功時返回 `{ success: true, data: 驗證後的資料 }`，失敗時返回包含錯誤詳情的物件
   *
   * @example
   * ```typescript
   * const request = new StoreUserRequest()
   * const result = await request.validate(ctx)
   *
   * if (result.success) {
   *   console.log('驗證成功:', result.data)
   * } else {
   *   console.log('驗證失敗:', result.error.error.details)
   * }
   * ```
   */
  async validate(
    ctx: Context
  ): Promise<
    { success: true; data: unknown } | { success: false; error: ValidationErrorResponse }
  > {
    const messageProvider = this.options.messageProvider ?? new DefaultMessageProvider()

    // 1. Authorization check
    if (this.authorize) {
      const authorized = await this.authorize(ctx)
      if (!authorized) {
        const authMessage =
          this.authorizationMessage?.() ?? messageProvider.getUnauthorizedMessage()
        return {
          success: false,
          error: {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: authMessage,
              details: [],
            },
          },
        }
      }
    }

    // 2. Get data
    let data = await this.getData(ctx)

    // 3. Transform if needed
    if (this.transform) {
      data = this.transform(data)
    }

    // 4. Validate with appropriate schema library
    const validator = SchemaValidatorFactory.getValidator(this.schema)
    const result = await validator.validate(this.schema, data)

    if (!result.success) {
      const details: ValidationErrorDetail[] = (result.errors ?? []).map((err) => ({
        field: err.path.join('.'),
        message: this.getErrorMessage(err.path.join('.'), err.code, err.message),
        code: err.code,
      }))

      return {
        success: false,
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: messageProvider.getValidationFailedMessage(),
            details,
          },
        },
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * 提取驗證 schema 的元資料供前端使用（Blueprint）
   *
   * 將後端的驗證規則轉換為可序列化的 JSON 格式，讓前端能夠實現相同的驗證邏輯。
   * 這避免了在前後端重複定義驗證規則，確保驗證邏輯的一致性。
   *
   * 典型用途：
   * - 在前端表單中即時顯示驗證錯誤
   * - 產生動態表單 UI
   * - 提供 API 文件
   *
   * @returns 包含 schema 結構和驗證規則的元資料物件
   *
   * @example
   * ```typescript
   * const request = new StoreUserRequest()
   * const blueprint = request.getBlueprint()
   * // 返回類似：
   * // {
   * //   fields: {
   * //     name: { type: 'string', required: true, minLength: 2 },
   * //     email: { type: 'string', required: true, format: 'email' }
   * //   },
   * //   source: 'json'
   * // }
   *
   * // 前端可以使用這個 blueprint 來驗證使用者輸入
   * app.get('/api/users/blueprint', (ctx) => {
   *   const request = new StoreUserRequest()
   *   return ctx.json(request.getBlueprint())
   * })
   * ```
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}

/**
 * 建立驗證中介層
 *
 * 將 FormRequest 類別轉換為 Gravito 中介層，用於在路由處理器執行前自動驗證請求。
 * 這是使用 FormRequest 的主要方式，提供了簡潔的 API 來整合驗證邏輯。
 *
 * 工作流程：
 * 1. 為每個 FormRequest 類別建立單例實例（效能優化）
 * 2. 執行 FormRequest 的 `validate()` 方法
 * 3. 如果驗證通過，將驗證後的資料儲存到 `ctx.get('validated')`
 * 4. 如果驗證失敗，拋出 `ValidationException` 或 `AuthorizationException`
 *
 * @param RequestClass - FormRequest 類別的建構子
 * @returns Gravito 中介層處理器，可直接用於路由定義
 *
 * @throws {ValidationException} 當請求資料不符合 schema 規則時
 * @throws {AuthorizationException} 當 `authorize()` 方法返回 false 時
 *
 * @example
 * ```typescript
 * import { validateRequest } from '@gravito/impulse'
 * import { StoreUserRequest } from './requests/StoreUserRequest'
 *
 * // 在路由中使用驗證中介層
 * app.post('/users', validateRequest(StoreUserRequest), async (ctx) => {
 *   // 此時資料已經過驗證，可以安全使用
 *   const data = ctx.get('validated') as z.infer<typeof StoreUserRequest.prototype.schema>
 *   const user = await db.users.create(data)
 *   return ctx.json(user, 201)
 * })
 *
 * // 也可以組合多個中介層
 * app.post('/admin/users',
 *   authenticate(),
 *   validateRequest(StoreUserRequest),
 *   async (ctx) => {
 *     // ...
 *   }
 * )
 * ```
 */
export function validateRequest<T>(RequestClass: new () => FormRequest<T>): MiddlewareHandler {
  return async (ctx, next) => {
    // Import FormRequestInstanceCache lazily to avoid circular dependency
    const { FormRequestInstanceCache } = require('./core/FormRequestInstanceCache')

    // Use cached instance instead of creating new one every time
    const request = FormRequestInstanceCache.getInstance(RequestClass)
    const result = await request.validate(ctx)

    if (!result.success) {
      const errorData = result.error.error

      if (errorData.code === 'AUTHORIZATION_ERROR') {
        throw new AuthorizationException(errorData.message)
      }

      if (errorData.code === 'VALIDATION_ERROR') {
        const exception = new ValidationException(
          errorData.details.map((d: any) => ({
            field: d.field,
            message: d.message,
            ...(d.code !== undefined ? { code: d.code } : {}),
          })),
          errorData.message
        )

        if (request.redirect) {
          const url = request.redirect()
          if (url) {
            exception.withRedirect(url)
          }
        }

        // Attach input data for flashing
        exception.withInput(await request.getData(ctx))

        throw exception
      }

      // Fallback for unknown errors (shouldn't happen with current implementation)
      const status: ContentfulStatusCode = request.options.errorStatus ?? 422
      return ctx.json(result.error, status)
    }

    // Store validated data in context
    ctx.set('validated', result.data)
    await next()
    return undefined
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Validated request data from FormRequest */
    validated?: unknown
  }
}
