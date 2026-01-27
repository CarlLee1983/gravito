/**
 * Relay Connection 實作
 * 符合 Relay 規範的 Cursor-based pagination
 */

import type { Model, ModelStatic } from '@gravito/atlas'
import { applyFilter, applyLogicalOperators } from '../filters'
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

    // 應用過濾條件
    if (where) {
      // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
      applyLogicalOperators(query as any, where, (q, col, val) => {
        // Simple filter application for now, assuming standard types
        // In a real implementation, we need schema context to know types
        // Here we default to string or infer simple types
        // This is a simplified version of what createAtlasSchema does
        // For full correctness, we should pass schema/columns info to this resolver factory

        // This logic mirrors createAtlasSchema's filter application but simplified
        if (typeof val === 'string') {
          // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
          applyFilter(q as any, col, { eq: val } as any, 'string')
        } else if (typeof val === 'number') {
          // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
          applyFilter(q as any, col, { eq: val } as any, 'number')
        } else if (typeof val === 'boolean') {
          // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
          q.where(col, '=', val)
        } else {
          // Assume it's an operator object
          // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
          applyFilter(q as any, col, val as any, 'string') // Defaulting to string type for operators if unknown
        }
      })
    }

    // 應用排序
    if (orderBy) {
      for (const [field, direction] of Object.entries(orderBy)) {
        query.orderBy(field, direction)
      }
    }

    // 獲取總數
    const countQuery = model.query()
    if (where) {
      // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
      applyLogicalOperators(countQuery as any, where, (q, col, val) => {
        // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
        if (typeof val === 'string') applyFilter(q as any, col, { eq: val } as any, 'string')
        // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
        else if (typeof val === 'number') applyFilter(q as any, col, { eq: val } as any, 'number')
        else if (typeof val === 'boolean') q.where(col, '=', val)
        // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
        else applyFilter(q as any, col, val as any, 'string')
      })
    }
    const totalCount = await countQuery.count()

    if (after) {
      try {
        const decoded = decodeCursor(after)
        query.where(model.primaryKey, '>', decoded.id)
      } catch (_error) {
        // Ignored
      }
    }

    if (before) {
      try {
        const decoded = decodeCursor(before)
        query.where(model.primaryKey, '<', decoded.id)
      } catch (_error) {
        // Ignored
      }
    }

    const limit = first ?? last ?? 20
    query.limit(limit + 1)

    if (last) {
      if (!orderBy) {
        query.orderBy(model.primaryKey, 'desc')
      }
    } else if (!orderBy) {
      query.orderBy(model.primaryKey, 'asc')
    }

    const rows = await query.get()

    if (last && !orderBy) {
      rows.reverse()
    }

    const hasMore = rows.length > limit
    const nodes = hasMore ? (first ? rows.slice(0, limit) : rows.slice(rows.length - limit)) : rows

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
