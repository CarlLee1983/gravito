import type { CursorPaginateResult, PaginateResult, QueryBuilderContract } from '../../types'
import { buildCursorWhereClause, decodeCursor, encodeCursor } from '../../utils/CursorEncoding'

/**
 * 分頁操作建構器。
 *
 * 封裝所有分頁相關方法（paginate, cursorPaginate, simplePaginate, chunk），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export class PaginationBuilder<T = Record<string, unknown>> {
  constructor(
    private readonly queryBuilder: QueryBuilderContract<T> & {
      orderByClause: {
        getOrders(): { column: string; direction: string }[]
        orderBy(column: string, direction: string): void
      }
      modelClass?: { primaryKey?: string }
      clone(): QueryBuilderContract<T>
      limit(value: number): QueryBuilderContract<T>
      offset(value: number): QueryBuilderContract<T>
      whereRaw(sql: string, bindings: unknown[]): QueryBuilderContract<T>
      count(): Promise<number>
      get(): Promise<T[]>
      ensureDeterministicOrder(primaryKey?: string): QueryBuilderContract<T>
    }
  ) {}

  /**
   * `simplePaginate` 為 `paginate` 的別名，維持 API 相容性。
   */
  async simplePaginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginate(perPage, page, primaryKey)
  }

  /**
   * 回傳帶有中繼資料的分頁結果集。
   *
   * @param perPage - 每頁筆數
   * @param page - 目前頁碼
   * @param primaryKey - 主鍵欄位名稱（用於確保排序穩定）
   */
  async paginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    this.queryBuilder.ensureDeterministicOrder(primaryKey)

    const total = await this.queryBuilder.clone().count()

    const data = await this.queryBuilder
      .clone()
      .limit(perPage)
      .offset((page - 1) * perPage)
      .get()

    const totalPages = Math.ceil(total / perPage)

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

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
  async cursorPaginate(
    limit = 15,
    cursor?: string,
    sortColumn = 'id',
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<CursorPaginateResult<T>> {
    // 取得模型的主鍵欄位名稱
    const primaryKey = (this.queryBuilder as any).modelClass?.primaryKey ?? 'id'

    // 套用游標條件至 WHERE 子句
    if (cursor) {
      const payload = decodeCursor(cursor)
      const { sql, bindings } = buildCursorWhereClause(payload, primaryKey)
      this.queryBuilder.whereRaw(sql, bindings)
    }

    // 確保排序的確定性
    if (sortColumn !== primaryKey) {
      const existingOrders = (this.queryBuilder as any).orderByClause.getOrders()
      const hasSortCol = existingOrders.some((o: any) => o.column === sortColumn)
      if (!hasSortCol) {
        ;(this.queryBuilder as any).orderByClause.orderBy(sortColumn, direction)
      }
    }
    const existingOrders = (this.queryBuilder as any).orderByClause.getOrders()
    const hasPkOrder = existingOrders.some((o: any) => o.column === primaryKey)
    if (!hasPkOrder) {
      ;(this.queryBuilder as any).orderByClause.orderBy(primaryKey, direction)
    }

    // 多抓一筆以偵測是否有更多記錄
    const rows = await this.queryBuilder
      .clone()
      .limit(limit + 1)
      .get()

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows

    // 從當前頁的最後一筆記錄建立下一頁游標
    let nextCursor: string | null = null
    if (hasMore && data.length > 0) {
      const lastRow = data[data.length - 1] as Record<string, unknown>
      nextCursor = encodeCursor({
        id: lastRow[primaryKey],
        sortValue: lastRow[sortColumn] ?? lastRow[primaryKey],
        sortColumn,
        direction,
      })
    }

    // 從當前頁的第一筆記錄建立上一頁游標
    let prevCursor: string | null = null
    if (cursor && data.length > 0) {
      const firstRow = data[0] as Record<string, unknown>
      prevCursor = encodeCursor({
        id: firstRow[primaryKey],
        sortValue: firstRow[sortColumn] ?? firstRow[primaryKey],
        sortColumn,
        direction: direction === 'asc' ? 'desc' : 'asc',
      })
    }

    return {
      data,
      nextCursor,
      prevCursor,
      hasMore,
      count: data.length,
    }
  }

  /**
   * 以記憶體高效的分批方式處理完整資料集。
   *
   * @param size - 每批筆數
   * @param callback - 每批的處理回呼，回傳 false 可中止
   */
  async chunk(
    size: number,
    callback: (results: T[]) => Promise<undefined | boolean>
  ): Promise<void> {
    let page = 1
    let count: number

    do {
      const results = await this.paginate(size, page)
      count = results.data.length

      if (count === 0) {
        break
      }

      const result = await callback(results.data)

      if (result === false) {
        break
      }

      page++
    } while (count === size)
  }
}
