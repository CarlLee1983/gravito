/**
 * 查詢優化器
 *
 * 功能：
 * 1. Eager Loading：減少 N+1 查詢
 * 2. Cursor-based Pagination：高效大數據集分頁
 * 3. 複合索引建議
 * 4. 查詢執行計劃追蹤
 */

export interface CursorPaginationRequest {
  cursor?: string // Base64 編碼的遊標
  limit: number // 單頁結果數
  direction?: 'next' | 'prev' // 分頁方向
}

export interface CursorPaginationResponse<T> {
  data: T[]
  nextCursor?: string // 下一頁遊標
  prevCursor?: string // 上一頁遊標
  hasMore: boolean
  limit: number
}

export interface EagerLoadOptions {
  include?: string[] // 要預加載的關聯字段
  maxDepth?: number // 最大加載深度
}

export interface QueryMetrics {
  executionTimeMs: number
  rowsScanned: number
  rowsReturned: number
  indexUsed?: string
  estimatedCost?: number
}

export class QueryOptimizer {
  /**
   * 編碼遊標
   */
  static encodeCursor(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  /**
   * 解碼遊標
   */
  static decodeCursor(cursor: string): Record<string, any> {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'))
    } catch {
      throw new Error('Invalid cursor format')
    }
  }

  /**
   * 應用 Eager Loading
   * @example
   * const users = await userRepository.eager(['orders', 'orders.items'])
   */
  static buildEagerLoadQuery(baseQuery: any, options: EagerLoadOptions): any {
    if (!options.include || options.include.length === 0) {
      return baseQuery
    }

    let query = baseQuery
    const maxDepth = options.maxDepth ?? 2

    for (const include of options.include) {
      const depth = include.split('.').length
      if (depth <= maxDepth) {
        query = query.with(include)
      }
    }

    return query
  }

  /**
   * 構建遊標分頁查詢
   * @example
   * const page = await userRepository.cursorPaginate({
   *   cursor: lastUserCursor,
   *   limit: 20,
   *   direction: 'next'
   * })
   */
  static async buildCursorPaginationQuery<T>(
    repository: any,
    request: CursorPaginationRequest,
    orderBy = 'id',
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<CursorPaginationResponse<T>> {
    const limit = Math.min(request.limit, 100) // 最多返回 100 條
    const offset = 1 // 多取一條以判斷是否有下一頁

    let query = repository.query()

    // =========================================================================
    // 應用遊標條件
    // =========================================================================
    if (request.cursor) {
      const cursorData = this.decodeCursor(request.cursor)
      const operator = direction === 'asc' ? '>' : '<'
      query = query.where(orderBy, operator, cursorData[orderBy])
    }

    // =========================================================================
    // 執行查詢
    // =========================================================================
    const results = await query
      .orderBy(orderBy, direction)
      .limit(limit + offset)
      .get()

    // =========================================================================
    // 構建響應
    // =========================================================================
    const hasMore = results.length > limit
    const data = hasMore ? results.slice(0, limit) : results

    const response: CursorPaginationResponse<T> = {
      data,
      hasMore,
      limit,
    }

    // 設置遊標
    if (data.length > 0) {
      response.nextCursor = this.encodeCursor({
        [orderBy]: data[data.length - 1][orderBy],
      })

      if (request.cursor) {
        response.prevCursor = request.cursor
      }
    }

    return response
  }

  /**
   * 檢測 N+1 查詢問題
   */
  static detectN1Queries(queries: Array<{ sql: string; duration: number }>): {
    hasN1Issues: boolean
    suspiciousPatterns: string[]
  } {
    const suspiciousPatterns: string[] = []

    // 檢查相似的查詢模式
    const queryPatterns = new Map<string, number>()

    for (const query of queries) {
      // 標準化 SQL（移除 WHERE 條件的值）
      const normalized = query.sql.replace(/= \d+/g, '= ?').replace(/IN \([^)]*\)/g, 'IN (?)')

      queryPatterns.set(normalized, (queryPatterns.get(normalized) ?? 0) + 1)
    }

    // 如果相同模式的查詢超過 5 次，可能是 N+1 問題
    for (const [pattern, count] of queryPatterns) {
      if (count > 5) {
        suspiciousPatterns.push(`Pattern "${pattern}" executed ${count} times`)
      }
    }

    return {
      hasN1Issues: suspiciousPatterns.length > 0,
      suspiciousPatterns,
    }
  }

  /**
   * 生成複合索引建議
   */
  static suggestIndexes(queries: Array<{ sql: string; duration: number }>): {
    suggestions: Array<{
      columns: string[]
      reason: string
      estimatedImprovement: string
    }>
  } {
    const suggestions: Array<{
      columns: string[]
      reason: string
      estimatedImprovement: string
    }> = []

    // 簡單的索引建議邏輯
    for (const query of queries) {
      // 檢查 WHERE 子句
      const whereMatch = query.sql.match(/WHERE\s+(.+?)\s+(AND|OR|GROUP|ORDER|LIMIT|$)/i)
      if (whereMatch) {
        const columns = whereMatch[1]
          .split(/\s+(AND|OR)\s+/)
          .filter((_, i) => i % 2 === 0)
          .map((c) => c.split('=')[0].trim())

        if (columns.length > 0) {
          suggestions.push({
            columns,
            reason: `Frequent WHERE clause: ${columns.join(', ')}`,
            estimatedImprovement: '30-50% faster',
          })
        }
      }

      // 檢查 ORDER BY 子句
      const orderMatch = query.sql.match(/ORDER\s+BY\s+(.+?)\s+(LIMIT|$)/i)
      if (orderMatch) {
        const columns = orderMatch[1].split(',').map((c) => c.trim().split(/\s+(ASC|DESC)/)[0])

        suggestions.push({
          columns,
          reason: `Frequent ORDER BY: ${columns.join(', ')}`,
          estimatedImprovement: '20-40% faster',
        })
      }
    }

    // 去重
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map((s) => [s.columns.join(','), s])).values()
    )

    return { suggestions: uniqueSuggestions.slice(0, 5) }
  }

  /**
   * 計算查詢成本
   */
  static calculateQueryCost(metrics: QueryMetrics): number {
    // 簡單的成本計算模型
    const scanCost = metrics.rowsScanned * 0.1
    const returnCost = metrics.rowsReturned * 0.01
    const timeCost = metrics.executionTimeMs * 1

    return Math.round((scanCost + returnCost + timeCost) * 100) / 100
  }
}
