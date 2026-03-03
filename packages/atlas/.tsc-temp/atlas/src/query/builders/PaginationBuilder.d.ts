import type { CursorPaginateResult, PaginateResult, QueryBuilderContract } from '../../types'
/**
 * 分頁操作建構器。
 *
 * 封裝所有分頁相關方法（paginate, cursorPaginate, simplePaginate, chunk），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export declare class PaginationBuilder<T = Record<string, unknown>> {
  private readonly queryBuilder
  constructor(
    queryBuilder: QueryBuilderContract<T> & {
      orderByClause: {
        getOrders(): {
          column: string
          direction: string
        }[]
        orderBy(column: string, direction: string): void
      }
      modelClass?: {
        primaryKey?: string
      }
      clone(): QueryBuilderContract<T>
      limit(value: number): QueryBuilderContract<T>
      offset(value: number): QueryBuilderContract<T>
      whereRaw(sql: string, bindings: unknown[]): QueryBuilderContract<T>
      count(): Promise<number>
      get(): Promise<T[]>
      ensureDeterministicOrder(primaryKey?: string): QueryBuilderContract<T>
    }
  )
  /**
   * `simplePaginate` 為 `paginate` 的別名，維持 API 相容性。
   */
  simplePaginate(perPage?: number, page?: number, primaryKey?: string): Promise<PaginateResult<T>>
  /**
   * 回傳帶有中繼資料的分頁結果集。
   *
   * @param perPage - 每頁筆數
   * @param page - 目前頁碼
   * @param primaryKey - 主鍵欄位名稱（用於確保排序穩定）
   */
  paginate(perPage?: number, page?: number, primaryKey?: string): Promise<PaginateResult<T>>
  /**
   * 基於游標的分頁，適合大型資料集。
   *
   * 使用 tuple comparison SQL 達到 O(1) 效能，
   * 適合無限捲動、API 游標及百萬筆資料的 Feed。
   *
   * @param limit - 每頁筆數
   * @param cursor - 上一頁的不透明游標字串（首頁傳 undefined）
   * @param sortColumn - 排序欄位（預設主鍵 'id'）
   * @param direction - 排序方向（預設 'asc'）
   */
  cursorPaginate(
    limit?: number,
    cursor?: string,
    sortColumn?: string,
    direction?: 'asc' | 'desc'
  ): Promise<CursorPaginateResult<T>>
  /**
   * 以記憶體高效的分批方式處理完整資料集。
   *
   * @param size - 每批筆數
   * @param callback - 每批的處理回呼，回傳 false 可中止
   */
  chunk(size: number, callback: (results: T[]) => Promise<undefined | boolean>): Promise<void>
}
