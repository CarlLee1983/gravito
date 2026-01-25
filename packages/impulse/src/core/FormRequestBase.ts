import type { Context } from '@gravito/core/compat'
import { BlueprintGenerator } from '../core/BlueprintGenerator'
import type { DataSource } from '../core/DataExtractor'
import { DataExtractor } from '../core/DataExtractor'
import type { DefaultMessageProvider, FormRequestOptions, MessageProvider } from '../FormRequest'
import type { ValidationResult } from './TypeUtils'

/**
 * 所有 FormRequest 實作的抽象基礎類別
 *
 * 提供通用的驗證流程框架，同時允許子類別（如 ZodFormRequest、ValibotFormRequest）
 * 定義各自的 schema 驗證邏輯。這種設計模式確保了不同驗證函式庫之間的一致性 API。
 *
 * 主要職責：
 * - 資料提取：從不同來源（JSON、表單、查詢參數等）統一提取資料
 * - 訊息解析：處理自訂錯誤訊息和國際化
 * - 共用邏輯：提供授權、轉換等可重用的功能
 *
 * 不應直接使用此類別，而應使用 `ZodFormRequest` 或 `ValibotFormRequest`。
 *
 * @typeParam TData - 驗證成功後的資料型別，通常從 schema 推論
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * // 不要直接使用 FormRequestBase
 * // ❌ class MyRequest extends FormRequestBase { ... }
 *
 * // 應該使用具體的實作類別
 * // ✅ class MyRequest extends ZodFormRequest { ... }
 * // ✅ class MyRequest extends ValibotFormRequest { ... }
 * ```
 */
export abstract class FormRequestBase<TData = unknown> {
  /** 資料來源：決定從請求的哪個部分提取資料進行驗證 */
  source: DataSource = 'json'

  /** 設定選項：自訂 HTTP 狀態碼和訊息提供者 */
  options: FormRequestOptions = {}

  /** 資料提取器實例：負責從 context 中提取原始資料 */
  private dataExtractor = new DataExtractor()

  /**
   * 授權檢查鉤子（可選）
   *
   * 在資料驗證前執行，用於檢查當前使用者是否有權限執行此操作。
   * 返回 false 將中止驗證並拋出 403 授權錯誤。
   *
   * @param ctx - 請求 context，可從中獲取使用者資訊
   * @returns 是否允許繼續執行驗證
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * 自訂授權錯誤訊息（可選）
   *
   * 當授權檢查失敗時，提供更具體的錯誤訊息給使用者。
   *
   * @returns 授權失敗時的錯誤訊息
   */
  authorizationMessage?(): string

  /**
   * 資料轉換鉤子（可選）
   *
   * 在 schema 驗證前對原始資料進行預處理。
   * 常用於型別強制轉換、新增預設值、或格式化輸入資料。
   *
   * @param data - 從請求中提取的原始資料
   * @returns 轉換後的資料
   */
  transform?(data: unknown): unknown

  /**
   * 自訂錯誤訊息映射（可選）
   *
   * 定義欄位級別的錯誤訊息，覆蓋驗證器的預設訊息。
   * 鍵值格式：`欄位名稱.錯誤代碼` 或僅 `欄位名稱`。
   *
   * @returns 錯誤訊息映射物件
   */
  messages?(): Record<string, string>

  /**
   * 驗證失敗時的重新導向 URL（可選）
   *
   * 用於伺服器端渲染的應用程式，指定驗證失敗時要重新導向的頁面。
   *
   * @returns 重新導向的目標 URL
   */
  redirect?(): string

  /**
   * 從請求 context 中提取原始資料
   *
   * 根據 `source` 屬性的設定，從對應的請求部分提取資料。
   * 此方法處理了不同資料來源（JSON、表單、查詢參數、路由參數）的複雜性。
   *
   * @param ctx - Gravito 請求 context 物件
   * @returns 原始資料物件（尚未驗證）
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * 解析驗證錯誤的最終訊息
   *
   * 按照優先順序查找適當的錯誤訊息：
   * 1. 自訂訊息（從 `messages()` 方法）
   * 2. 國際化訊息（從 `messageProvider`）
   * 3. 預設訊息（驗證器原始訊息）
   *
   * 這個方法是 protected，因為它是內部使用的輔助方法。
   *
   * @param field - 欄位名稱
   * @param code - 錯誤代碼（可選）
   * @param defaultMessage - 預設錯誤訊息
   * @returns 解析後的最終錯誤訊息
   */
  protected getErrorMessage(
    field: string,
    code: string | undefined,
    defaultMessage: string
  ): string {
    // 1. Check custom messages from messages() method
    if (this.messages) {
      const customMessages = this.messages()
      const key = code ? `${field}.${code}` : field
      if (customMessages[key]) {
        return customMessages[key]
      }
      // Try field-only key
      if (customMessages[field]) {
        return customMessages[field]
      }
    }

    // 2. Check i18n message provider
    if (this.options.messageProvider) {
      return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
    }

    // 3. Return default
    return defaultMessage
  }

  /**
   * 執行 schema 驗證的抽象方法
   *
   * 此方法必須由具體的子類別（如 ZodFormRequest、ValibotFormRequest）實作。
   * 每個子類別會根據其使用的驗證函式庫來實作驗證邏輯。
   *
   * @param ctx - 請求 context 物件
   * @returns 型別安全的驗證結果，包含驗證後的資料或錯誤資訊
   */
  abstract validate(ctx: Context): Promise<ValidationResult<TData>>

  /**
   * 提取驗證 schema 元資料的抽象方法
   *
   * 此方法必須由子類別實作，用於將 schema 轉換為可序列化的 JSON 格式。
   * 前端可使用這些元資料來實現相同的驗證規則，避免重複定義。
   *
   * @returns Schema 的結構化元資料物件
   */
  abstract getBlueprint(): Record<string, any>
}
