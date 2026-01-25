/**
 * Schema 驗證結果的統一介面
 *
 * 提供與驗證函式庫無關的標準化驗證結果格式。
 * 無論使用 Zod、Valibot 或其他驗證函式庫，都會轉換為這種統一格式。
 *
 * 設計理念：
 * - **一致性**：不同驗證函式庫的結果格式統一，簡化錯誤處理邏輯
 * - **詳細性**：提供完整的錯誤路徑和代碼，方便定位問題
 * - **可序列化**：所有欄位都可安全地轉為 JSON，適用於 API 回應
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // 驗證成功的結果
 * const successResult: SchemaValidationResult = {
 *   success: true,
 *   data: { name: 'John', email: 'john@example.com' }
 * }
 *
 * // 驗證失敗的結果
 * const failureResult: SchemaValidationResult = {
 *   success: false,
 *   errors: [
 *     {
 *       path: ['email'],
 *       message: '電子郵件格式不正確',
 *       code: 'invalid_string'
 *     }
 *   ]
 * }
 * ```
 */
export interface SchemaValidationResult {
  /** 驗證是否成功 */
  success: boolean
  /** 驗證成功時的解析資料（可能經過型別轉換） */
  data?: unknown
  /** 驗證失敗時的錯誤陣列，每個錯誤包含路徑、訊息和代碼 */
  errors?: Array<{
    /** 錯誤欄位的路徑（以陣列表示，如 ['user', 'email'] 代表 user.email） */
    path: string[]
    /** 人類可讀的錯誤訊息 */
    message: string
    /** 機器可讀的錯誤代碼（如 'invalid_string'、'too_small'） */
    code?: string | undefined
  }>
}

/**
 * Schema 驗證器的抽象基礎類別
 *
 * 實作策略模式（Strategy Pattern），讓系統能夠支援多種驗證函式庫。
 * 每個具體的驗證器（如 ZodValidator、ValibotValidator）都繼承此類別。
 *
 * 設計模式優勢：
 * - **開放封閉原則**：可輕鬆新增新的驗證函式庫支援，無需修改現有程式碼
 * - **統一介面**：所有驗證器提供一致的 API，簡化使用方式
 * - **執行時選擇**：根據 schema 型別自動選擇適當的驗證器
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // 實作自訂驗證器
 * class CustomValidator extends SchemaValidator {
 *   canHandle(schema: unknown): boolean {
 *     // 檢查 schema 是否為此驗證器支援的型別
 *     return schema instanceof CustomSchema
 *   }
 *
 *   async validate(schema: unknown, data: unknown): Promise<SchemaValidationResult> {
 *     // 執行驗證邏輯
 *     try {
 *       const result = (schema as CustomSchema).validate(data)
 *       return { success: true, data: result }
 *     } catch (error) {
 *       return {
 *         success: false,
 *         errors: [{ path: [], message: error.message }]
 *       }
 *     }
 *   }
 * }
 *
 * // 註冊自訂驗證器
 * SchemaValidatorFactory.register(new CustomValidator())
 * ```
 */
export abstract class SchemaValidator {
  /**
   * 使用 schema 驗證資料
   *
   * 具體的驗證邏輯由子類別實作，需要將驗證函式庫的結果轉換為統一的 `SchemaValidationResult` 格式。
   *
   * @param schema - 驗證 schema 物件
   * @param data - 待驗證的資料
   * @returns 統一格式的驗證結果
   */
  abstract validate(schema: unknown, data: unknown): Promise<SchemaValidationResult>

  /**
   * 檢查此驗證器是否能處理給定的 schema
   *
   * 用於執行時自動選擇適當的驗證器。每個驗證器透過鴨子型別（duck typing）
   * 或 instanceof 檢查來判斷 schema 是否為其支援的型別。
   *
   * @param schema - 待檢查的 schema 物件
   * @returns 是否支援此 schema
   */
  abstract canHandle(schema: unknown): boolean
}

/**
 * Schema 驗證器工廠
 *
 * 管理所有已註冊的驗證器，並根據 schema 型別自動選擇適當的驗證器。
 * 使用工廠模式和快取機制來優化效能，避免重複的驗證器查找。
 *
 * 工作原理：
 * 1. 應用程式啟動時註冊所有支援的驗證器（ZodValidator、ValibotValidator 等）
 * 2. 收到驗證請求時，遍歷已註冊的驗證器，找到第一個能處理該 schema 的驗證器
 * 3. 使用 SchemaCache 快取 schema 與驗證器的對應關係，提升後續查找速度
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // 註冊自訂驗證器（通常在應用程式初始化時執行）
 * import { SchemaValidatorFactory } from '@gravito/impulse'
 * import { CustomValidator } from './validators/CustomValidator'
 *
 * SchemaValidatorFactory.register(new CustomValidator())
 *
 * // 自動選擇驗證器（由 FormRequest 內部呼叫）
 * const validator = SchemaValidatorFactory.getValidator(mySchema)
 * const result = await validator.validate(mySchema, data)
 * ```
 */
export class SchemaValidatorFactory {
  /** 已註冊的驗證器陣列，按照註冊順序儲存 */
  private static validators: SchemaValidator[] = []

  /**
   * 註冊新的 schema 驗證器
   *
   * 將驗證器加入到可用驗證器列表中。註冊順序會影響驗證器的選擇優先順序，
   * 第一個匹配的驗證器會被使用。
   *
   * @param validator - 要註冊的驗證器實例
   *
   * @example
   * ```typescript
   * // 註冊內建驗證器（已在 validation/index.ts 中自動完成）
   * SchemaValidatorFactory.register(new ZodValidator())
   * SchemaValidatorFactory.register(new ValibotValidator())
   * ```
   */
  static register(validator: SchemaValidator): void {
    this.validators.push(validator)
  }

  /**
   * 為 schema 獲取適當的驗證器（帶快取）
   *
   * 使用 SchemaCache 快取 schema 與驗證器的對應關係，大幅提升重複驗證的效能。
   * 對於同一個 schema 物件，第二次查找會直接從快取中返回，避免遍歷所有驗證器。
   *
   * @param schema - 待驗證的 schema 物件
   * @returns 能處理該 schema 的驗證器
   *
   * @throws {Error} 如果找不到支援該 schema 的驗證器
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const schema = z.object({ name: z.string() })
   * const validator = SchemaValidatorFactory.getValidator(schema)
   * // 返回 ZodValidator 實例
   *
   * // 第二次查找同一個 schema 會使用快取
   * const cachedValidator = SchemaValidatorFactory.getValidator(schema)
   * // 立即返回，無需遍歷驗證器列表
   * ```
   */
  static getValidator(schema: unknown): SchemaValidator {
    // Import SchemaCache lazily to avoid circular dependency
    const { SchemaCache } = require('../core/SchemaCache')

    // Delegate to cached implementation
    return SchemaCache.getValidator(schema)
  }

  /**
   * 獲取所有已註冊的驗證器
   *
   * 此方法供 SchemaCache 內部使用，用於遍歷驗證器尋找匹配的實例。
   * 返回驗證器陣列的副本，避免外部修改內部狀態。
   *
   * @internal
   * @returns 已註冊的驗證器陣列副本
   */
  static getValidators(): SchemaValidator[] {
    return [...this.validators]
  }
}
