import type { SchemaValidator } from '../validation/SchemaValidator'

/**
 * Schema 驗證器快取
 *
 * 透過快取 schema 與驗證器的對應關係，大幅提升重複驗證的效能。
 * 避免每次驗證都重新遍歷所有驗證器來判斷 schema 型別。
 *
 * 效能優化技術：
 * - **WeakMap 快取**：O(1) 時間複雜度的查找，且不會造成記憶體洩漏
 * - **自動清理**：當 schema 物件被垃圾回收時，快取項目也會自動移除
 * - **驗證器預註冊**：避免重複從 Factory 獲取驗證器列表
 *
 * 效能提升：
 * - 第一次驗證：需要遍歷驗證器列表 (O(n))
 * - 後續驗證：直接從快取返回 (O(1))
 * - 對於同一個 schema 的重複驗證，效能提升可達 10-100 倍
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { SchemaCache } from '@gravito/impulse'
 *
 * const schema = z.object({ name: z.string() })
 *
 * // 第一次查找：遍歷驗證器列表
 * const validator1 = SchemaCache.getValidator(schema)  // ~0.1ms
 *
 * // 第二次查找：從快取返回
 * const validator2 = SchemaCache.getValidator(schema)  // ~0.001ms
 * ```
 */
export class SchemaCache {
  /**
   * Schema 到驗證器的對應快取
   *
   * 使用 WeakMap 而非 Map 的原因：
   * - WeakMap 的鍵是弱引用，不會阻止 schema 物件被垃圾回收
   * - 避免記憶體洩漏，特別是在動態產生 schema 的場景
   * - 當 schema 物件不再使用時，對應的快取項目會自動清除
   */
  private static schemaValidatorCache = new WeakMap<object, SchemaValidator>()

  /**
   * 已註冊的驗證器實例列表
   *
   * 快取驗證器列表以避免每次都從 Factory 獲取，減少陣列複製開銷。
   */
  private static validatorInstances: SchemaValidator[] = []

  /**
   * 註冊驗證器供快取查找使用
   *
   * 在模組初始化時呼叫，預先載入所有可用的驗證器。
   * 這避免了每次查找時都要從 Factory 獲取驗證器列表。
   *
   * @param validators - 要註冊的驗證器陣列
   *
   * @example
   * ```typescript
   * import { ZodValidator, ValibotValidator } from '@gravito/impulse'
   *
   * SchemaCache.registerValidators([
   *   new ZodValidator(),
   *   new ValibotValidator()
   * ])
   * ```
   */
  static registerValidators(validators: SchemaValidator[]): void {
    this.validatorInstances = [...validators]
  }

  /**
   * 獲取 schema 對應的驗證器（帶快取）
   *
   * 實作快取策略：
   * 1. 快速路徑：原始型別（非物件）直接偵測，無法快取
   * 2. 快取命中：從 WeakMap 快取中立即返回（O(1)）
   * 3. 快取未命中：偵測驗證器並加入快取
   *
   * 此方法是驗證流程的效能瓶頸優化點，對高頻驗證場景有顯著效能提升。
   *
   * @param schema - 待查找驗證器的 schema
   * @returns 能處理該 schema 的驗證器
   *
   * @throws {Error} 如果找不到支援該 schema 的驗證器
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const userSchema = z.object({ name: z.string() })
   *
   * // 第一次：偵測並快取
   * const validator = SchemaCache.getValidator(userSchema)
   *
   * // 後續使用同一個 schema 物件：從快取返回
   * const cachedValidator = SchemaCache.getValidator(userSchema)
   * console.log(validator === cachedValidator)  // true
   * ```
   */
  static getValidator(schema: unknown): SchemaValidator {
    // Fast path: primitive types cannot be cached
    if (typeof schema !== 'object' || schema === null) {
      return this.detectValidator(schema)
    }

    // Check cache first (WeakMap lookup is O(1))
    const cached = this.schemaValidatorCache.get(schema)
    if (cached) {
      return cached
    }

    // Cache miss: detect and cache
    const validator = this.detectValidator(schema)
    this.schemaValidatorCache.set(schema, validator)

    return validator
  }

  /**
   * Detect appropriate validator for a schema.
   * This is the fallback when cache misses or for primitive types.
   */
  private static detectValidator(schema: unknown): SchemaValidator {
    for (const validator of this.validatorInstances) {
      if (validator.canHandle(schema)) {
        return validator
      }
    }
    throw new Error('Unsupported schema type. Use Zod or Valibot.')
  }

  /**
   * Clear the cache (useful for testing).
   * In production, the WeakMap will automatically clean up when schemas are GC'd.
   */
  static clearCache(): void {
    this.schemaValidatorCache = new WeakMap<object, SchemaValidator>()
  }

  /**
   * Get cache statistics for monitoring.
   * Note: WeakMap doesn't provide size information for privacy reasons.
   */
  static getCacheStats(): { registeredValidators: number } {
    return {
      registeredValidators: this.validatorInstances.length,
    }
  }
}
