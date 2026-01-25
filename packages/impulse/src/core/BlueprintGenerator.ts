/**
 * 驗證 Schema 元資料提取器
 *
 * 將後端的驗證 schema（Zod、Valibot 等）轉換為可序列化的 JSON 元資料格式。
 * 讓前端能夠獲取驗證規則，實現前後端驗證邏輯的一致性，避免重複定義。
 *
 * 典型使用場景：
 * - **動態表單產生**：根據 blueprint 在前端自動產生表單欄位和驗證規則
 * - **即時驗證**：在使用者輸入時提供即時的驗證回饋
 * - **API 文件**：自動產生 API 請求參數的規格文件
 * - **測試資料產生**：根據 schema 規則產生符合規範的測試資料
 *
 * 設計理念：
 * - **無侵入性**：不需要修改現有的 schema 定義
 * - **輕量級**：只提取必要的元資料，保持 payload 小巧
 * - **可擴展**：易於新增對其他驗證函式庫的支援
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { BlueprintGenerator } from '@gravito/impulse'
 *
 * const schema = z.object({
 *   name: z.string().min(2).max(50),
 *   email: z.string().email(),
 *   age: z.number().int().min(18)
 * })
 *
 * const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')
 * // 返回:
 * // {
 * //   source: 'json',
 * //   rules: {
 * //     name: { type: 'string', required: true, min: 2, max: 50 },
 * //     email: { type: 'string', required: true, format: 'email' },
 * //     age: { type: 'number', required: true, min: 18, integer: true }
 * //   }
 * // }
 * ```
 */
export class BlueprintGenerator {
  /**
   * 檢查 schema 是否為 Zod schema
   *
   * 使用鴨子型別（duck typing）來判斷，檢查是否存在 Zod schema 的特徵屬性。
   * 這種方式避免了直接依賴 Zod 套件，保持函式庫的輕量性。
   *
   * @param schema - 待檢查的 schema 物件
   * @returns 是否為 Zod schema
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const zodSchema = z.string()
   * BlueprintGenerator.isZodSchema(zodSchema)  // true
   *
   * const plainObject = { type: 'string' }
   * BlueprintGenerator.isZodSchema(plainObject)  // false
   * ```
   */
  static isZodSchema(schema: unknown): boolean {
    return (
      schema !== null &&
      typeof schema === 'object' &&
      '_def' in schema &&
      typeof (schema as any)._def === 'object' &&
      'shape' in (schema as any)._def
    )
  }

  /**
   * 提取驗證 schema 的元資料
   *
   * 解析 schema 的內部結構，提取每個欄位的驗證規則、型別資訊和限制條件。
   * 目前支援 Zod schema，未來可擴展支援其他驗證函式庫。
   *
   * 提取的元資料包括：
   * - 欄位型別（string、number、boolean、enum、array 等）
   * - 是否必填（required）
   * - 長度/值限制（min、max）
   * - 格式要求（email、url、regex 等）
   * - 預設值（default）
   *
   * @param schema - 驗證 schema 物件
   * @param source - 資料來源類型（json、form、query、param）
   * @returns Blueprint 物件，包含資料來源和所有欄位的驗證規則
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const userSchema = z.object({
   *   name: z.string().min(2),
   *   email: z.string().email(),
   *   age: z.number().int().optional(),
   *   role: z.enum(['user', 'admin']).default('user')
   * })
   *
   * const blueprint = BlueprintGenerator.generateBlueprint(userSchema, 'json')
   *
   * // 前端可使用此 blueprint 來驗證表單輸入
   * function validateField(fieldName: string, value: any) {
   *   const rule = blueprint.rules[fieldName]
   *   if (rule.required && !value) {
   *     return '此欄位為必填'
   *   }
   *   if (rule.type === 'string' && rule.min && value.length < rule.min) {
   *     return `最少需要 ${rule.min} 個字元`
   *   }
   *   // ...更多驗證邏輯
   * }
   * ```
   */
  static generateBlueprint(schema: unknown, source: string): Record<string, any> {
    const blueprint: Record<string, any> = {
      source,
      rules: {},
    }

    if (this.isZodSchema(schema)) {
      const def = (schema as any)._def
      if (def?.shape) {
        const shape = def.shape()
        for (const [key, field] of Object.entries(shape)) {
          blueprint.rules[key] = this.parseZodField(field)
        }
      }
    }

    return blueprint
  }

  /**
   * 解析單一 Zod 欄位的元資料
   *
   * 遞迴地展開 Zod schema 的包裝層（如 optional、nullable、default），
   * 提取核心的型別資訊和驗證規則。
   *
   * 支援的 Zod 型別：
   * - ZodString：提取 min、max、email、url、regex 等規則
   * - ZodNumber：提取 min、max、int 等規則
   * - ZodBoolean：布林值
   * - ZodEnum：提取可選值列表
   * - ZodArray：遞迴解析陣列元素型別
   * - ZodOptional：標記為非必填
   * - ZodNullable：標記為可為 null
   * - ZodDefault：提取預設值
   *
   * @param field - Zod schema 欄位物件
   * @returns 欄位的元資料物件
   *
   * @internal
   */
  private static parseZodField(field: any): any {
    const metadata: any = { type: 'string', required: true }
    let current = field

    // Unwrap optional/nullable/default
    while (current._def) {
      const def = current._def
      const typeName = def.typeName

      if (typeName === 'ZodOptional') {
        metadata.required = false
        current = def.innerType
      } else if (typeName === 'ZodNullable') {
        metadata.nullable = true
        current = def.innerType
      } else if (typeName === 'ZodDefault') {
        metadata.default = def.defaultValue()
        metadata.required = false
        current = def.innerType
      } else if (typeName === 'ZodString') {
        metadata.type = 'string'
        def.checks?.forEach((check: any) => {
          if (check.kind === 'min') {
            metadata.min = check.value
          }
          if (check.kind === 'max') {
            metadata.max = check.value
          }
          if (check.kind === 'email') {
            metadata.format = 'email'
          }
          if (check.kind === 'url') {
            metadata.format = 'url'
          }
          if (check.kind === 'regex') {
            metadata.pattern = check.regex.source
          }
        })
        break
      } else if (typeName === 'ZodNumber') {
        metadata.type = 'number'
        def.checks?.forEach((check: any) => {
          if (check.kind === 'min') {
            metadata.min = check.value
          }
          if (check.kind === 'max') {
            metadata.max = check.value
          }
          if (check.kind === 'int') {
            metadata.integer = true
          }
        })
        break
      } else if (typeName === 'ZodBoolean') {
        metadata.type = 'boolean'
        break
      } else if (typeName === 'ZodEnum') {
        metadata.type = 'enum'
        metadata.options = def.values
        break
      } else if (typeName === 'ZodArray') {
        metadata.type = 'array'
        metadata.items = this.parseZodField(def.type)
        break
      } else {
        break
      }
    }

    return metadata
  }
}
