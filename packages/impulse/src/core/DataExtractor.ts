import type { Context } from '@gravito/core/compat'

/**
 * 請求資料來源類型
 *
 * 定義 FormRequest 可以從哪些部分提取資料進行驗證。
 * 每種來源類型對應請求的不同部分，適用於不同的 API 設計模式。
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // JSON 請求主體 - 適用於 POST/PUT/PATCH API
 * source: DataSource = 'json'
 *
 * // 表單資料 - 適用於檔案上傳或傳統 HTML 表單
 * source: DataSource = 'form'
 *
 * // URL 查詢參數 - 適用於 GET 請求的過濾和分頁
 * source: DataSource = 'query'
 *
 * // 路由參數 - 適用於驗證 URL 中的資源 ID
 * source: DataSource = 'param'
 * ```
 */
export type DataSource = 'json' | 'form' | 'query' | 'param'

/**
 * 請求資料提取器
 *
 * 封裝從不同請求來源提取資料的複雜邏輯，提供統一的介面。
 * 處理了各種邊緣情況，如空請求主體、格式錯誤的 JSON、以及陣列查詢參數的扁平化。
 *
 * 設計考量：
 * - **錯誤容忍**：解析失敗時返回空物件而非拋出錯誤，讓驗證器來處理
 * - **效能優化**：對 JSON 請求主體進行快取，避免重複解析
 * - **型別安全**：雖然返回 `unknown`，但為後續的 schema 驗證提供了基礎
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const extractor = new DataExtractor()
 *
 * // 提取 JSON 請求主體
 * const jsonData = await extractor.extract(ctx, 'json')
 *
 * // 提取查詢參數
 * const queryData = await extractor.extract(ctx, 'query')
 * ```
 */
export class DataExtractor {
  /**
   * 從指定來源提取原始資料
   *
   * 根據 `source` 參數決定提取策略：
   * - `json`: 解析 JSON 請求主體（帶快取和錯誤處理）
   * - `form`: 解析 FormData 並轉換為普通物件
   * - `query`: 解析 URL 查詢參數（扁平化單元素陣列）
   * - `param`: 提取路由參數
   *
   * @param ctx - Gravito 請求 context 物件
   * @param source - 資料來源類型
   * @returns 原始資料物件，解析失敗時返回空物件
   *
   * @example
   * ```typescript
   * // 從 JSON 主體提取
   * const data = await extractor.extract(ctx, 'json')
   * // 可能返回: { name: "John", email: "john@example.com" }
   *
   * // 從查詢參數提取
   * // URL: /users?page=1&limit=10&sort=name
   * const query = await extractor.extract(ctx, 'query')
   * // 返回: { page: "1", limit: "10", sort: "name" }
   * ```
   */
  public async extract(ctx: Context, source: DataSource): Promise<unknown> {
    switch (source) {
      case 'json': {
        const contentType = ctx.req.header('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return {}
        }

        const cached = ctx.get('__parsedBody')
        if (cached !== undefined) {
          return cached
        }

        const body = await ctx.req.json().catch(() => ({}))
        ctx.set('__parsedBody', body)
        return body
      }
      case 'form': {
        const fd = await ctx.req.formData().catch(() => null)
        if (!fd) {
          return {}
        }
        const obj: Record<string, unknown> = {}
        fd.forEach((value, key) => {
          obj[key] = value
        })
        return obj
      }
      case 'query': {
        const queries = ctx.req.queries()
        const flattened: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(queries)) {
          if (Array.isArray(value) && value.length === 1) {
            flattened[key] = value[0]
          } else {
            flattened[key] = value
          }
        }
        return flattened
      }
      case 'param': {
        // Try standard Gravito/Hono param accessor
        if (typeof ctx.req.param === 'function') {
          // In some Hono versions, param() returns all params if no key provided
          // or we might need to check if params() exists (Gravito extension)
          const params = (ctx.req as any).param()
          if (typeof params === 'object') return params
        }
        if (typeof (ctx.req as any).params === 'function') {
          return (ctx.req as any).params()
        }
        return {}
      }
      default:
        return {}
    }
  }
}
