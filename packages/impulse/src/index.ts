/**
 * @gravito/impulse
 *
 * 類似 Laravel FormRequest 的宣告式請求驗證函式庫
 *
 * 提供優雅的方式來驗證 HTTP 請求資料，將驗證邏輯從控制器中分離出來。
 * 支援 Zod 和 Valibot 兩種主流的 TypeScript schema 驗證函式庫。
 *
 * 核心功能：
 * - **宣告式驗證**：使用類別定義驗證規則，提升程式碼可讀性和可維護性
 * - **授權整合**：在同一個類別中處理授權和驗證邏輯
 * - **型別安全**：完整的 TypeScript 型別推論，驗證後的資料自動獲得正確型別
 * - **自訂訊息**：支援欄位級別的錯誤訊息自訂和國際化
 * - **Blueprint**：提取驗證規則供前端使用，確保前後端驗證一致性
 * - **效能優化**：內建多層快取機制，大幅提升重複驗證的效能
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * // 基本使用範例
 * import { ZodFormRequest, validateRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 *
 *   authorize(ctx: Context) {
 *     return ctx.get('user')?.role === 'admin'
 *   }
 * }
 *
 * app.post('/users', validateRequest(CreateUserRequest), (ctx) => {
 *   const data = ctx.get('validated')
 *   // data 已驗證且型別安全
 * })
 * ```
 */

// Re-export zod for convenience
export { z } from 'zod'

// Export core components
export * from './core/BlueprintGenerator'
export type { DataSource } from './core/DataExtractor'
export * from './core/DataExtractor'
// Export typed FormRequest base classes
export * from './core/FormRequestBase'
// Export performance optimization utilities
export * from './core/FormRequestInstanceCache'
export * from './core/MessageCache'
export * from './core/SchemaCache'
// Export type utilities for advanced usage
export * from './core/TypeUtils'
export * from './core/ValibotFormRequest'
export * from './core/ZodFormRequest'

// Export legacy FormRequest and related types
export type {
  FormRequestOptions,
  MessageProvider,
  ValidationErrorDetail,
  ValidationErrorResponse,
} from './FormRequest'
export {
  DefaultMessageProvider,
  FormRequest,
  validateRequest,
} from './FormRequest'

// Export validation components for advanced usage
export * from './validation/index'
