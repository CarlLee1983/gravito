/**
 * Relay Connection 實作
 * 符合 Relay 規範的 Cursor-based pagination
 */

import type { Model, ModelStatic } from '@gravito/atlas'
import { decodeCursor, encodeCursor } from './cursor'

export interface ConnectionArgs {
  first?: number
  after?: string
  last?: number
  before?: string
  where?: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>
}

export interface Edge<T> {
  node: T
  cursor: string
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export interface Connection<T> {
  edges: Edge<T>[]
  pageInfo: PageInfo
  totalCount: number
}

/**
 * 生成 Connection 類型定義
 */
export function generateConnectionTypes(modelName: string): string {
  return `
    type ${modelName}Edge {
      node: ${modelName}!
      cursor: String!
    }
    
    type ${modelName}Connection {
      edges: [${modelName}Edge!]!
      pageInfo: PageInfo!
      totalCount: Int
    }
    
    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      startCursor: String
      endCursor: String
    }
  `.trim()
}

/**
 * 生成 Connection 查詢定義
 */
export function generateConnectionQuery(modelName: string): string {
  const lowercaseName = modelName.charAt(0).toLowerCase() + modelName.slice(1)

  return `
    ${lowercaseName}Connection(
      first: Int
      after: String
      last: Int
      before: String
      where: ${modelName}WhereInput
      orderBy: ${modelName}OrderByInput
    ): ${modelName}Connection
  `.trim()
}

/**
 * 創建 Connection Resolver
 */
export function createConnectionResolver<T extends Model>(
  model: ModelStatic<T>
): (parent: unknown, args: ConnectionArgs) => Promise<Connection<T>> {
  return async (_parent: unknown, args: ConnectionArgs): Promise<Connection<T>> => {
    const { first, after, last, before, where, orderBy } = args

    // 建立查詢
    const query = model.query()

    // 應用過濾條件（這裡簡化處理，實際應整合 filters 模組）
    if (where) {
      // TODO: 整合進階過濾器
    }

    // 應用排序
    if (orderBy) {
      for (const [field, direction] of Object.entries(orderBy)) {
        query.orderBy(field, direction)
      }
    }

    // 獲取總數
    const totalCount = await model.count()

    // 應用 cursor 分頁
    if (after) {
      try {
        const cursor = decodeCursor(after)
        query.where(model.primaryKey, '>', cursor.id)
      } catch {
        // 無效 cursor，忽略
      }
    }

    if (before) {
      try {
        const cursor = decodeCursor(before)
        query.where(model.primaryKey, '<', cursor.id)
      } catch {
        // 無效 cursor，忽略
      }
    }

    // 確定要取多少筆（多取一筆檢查 hasNextPage）
    const limit = first ?? last ?? 20
    query.limit(limit + 1)

    // 執行查詢
    const rows = await query.get()
    const hasMore = rows.length > limit
    const nodes = hasMore ? rows.slice(0, limit) : rows

    // 建立 edges
    const edges: Edge<T>[] = nodes.map((node, index) => ({
      node,
      cursor: encodeCursor({
        id: node.getKey(),
        offset: index,
      }),
    }))

    // 建立 pageInfo
    const pageInfo: PageInfo = {
      hasNextPage: first ? hasMore : false,
      hasPreviousPage: !!after || !!before,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    }

    return {
      edges,
      pageInfo,
      totalCount,
    }
  }
}
