// biome-ignore-all lint/suspicious/noExplicitAny: Complex Atlas Query Builder integration requires any casting

/**
 * Relay Connection Implementation.
 *
 * Implements the Relay Cursor-based Pagination specification, enabling efficient
 * navigation through large datasets using opaque cursors.
 *
 * @see {@link https://relay.dev/graphql/connections.htm}
 */

import type { Model, ModelStatic } from '@gravito/atlas'
import { applyFilter, applyLogicalOperators } from '../filters'
import { decodeCursor, encodeCursor } from './cursor'

/**
 * Standard arguments for a Relay Connection query.
 */
export interface ConnectionArgs {
  /** The number of items to return after the `after` cursor. */
  first?: number
  /** The opaque cursor pointing to the item after which results should be returned. */
  after?: string
  /** The number of items to return before the `before` cursor. */
  last?: number
  /** The opaque cursor pointing to the item before which results should be returned. */
  before?: string
  /** Complex filtering conditions to apply to the query. */
  where?: Record<string, unknown>
  /** Sorting order for the result set. */
  orderBy?: Record<string, 'asc' | 'desc'>
}

/**
 * An edge in a connection, representing a single node and its cursor.
 */
export interface Edge<T> {
  /** The actual data object. */
  node: T
  /** The opaque cursor for this specific node. */
  cursor: string
}

/**
 * Information about pagination in a connection.
 */
export interface PageInfo {
  /** Indicates if there are more items after the current set. */
  hasNextPage: boolean
  /** Indicates if there are more items before the current set. */
  hasPreviousPage: boolean
  /** The cursor for the first item in the edges list. */
  startCursor: string | null
  /** The cursor for the last item in the edges list. */
  endCursor: string | null
}

/**
 * A connection object containing a list of edges and pagination metadata.
 */
export interface Connection<T> {
  /** A list of edges containing the nodes and cursors. */
  edges: Edge<T>[]
  /** Metadata for the current page of results. */
  pageInfo: PageInfo
  /** The total number of items matching the query across all pages. */
  totalCount: number
}

/**
 * Generates the SDL for Relay Connection types for a specific model.
 *
 * This includes the Edge, Connection, and shared PageInfo types required
 * by the Relay specification.
 *
 * @param modelName - The name of the Atlas model.
 * @returns The GraphQL type definitions as a string.
 *
 * @example
 * ```typescript
 * const sdl = generateConnectionTypes('User');
 * ```
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
 * Generates the SDL for a Relay Connection query field.
 *
 * @param modelName - The name of the Atlas model.
 * @returns The GraphQL query field definition.
 *
 * @example
 * ```typescript
 * const query = generateConnectionQuery('User');
 * ```
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
 * Creates a resolver function for a Relay Connection.
 *
 * The generated resolver handles cursor decoding/encoding, limit/offset
 * calculation, filtering, and total count fetching automatically.
 *
 * @param model - The Atlas model static class.
 * @returns A GraphQL resolver function.
 *
 * @example
 * ```typescript
 * const resolver = createConnectionResolver(User);
 * ```
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
        if (typeof val === 'string') {
          applyFilter(q as any, col, { eq: val } as any, 'string')
        }
        // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
        else if (typeof val === 'number') {
          applyFilter(q as any, col, { eq: val } as any, 'number')
        } else if (typeof val === 'boolean') {
          q.where(col, '=', val)
        }
        // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
        else {
          applyFilter(q as any, col, val as any, 'string')
        }
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
