/**
 * MongoDB Grammar
 * @description Translates generic CompiledQuery into a MongoDB Query Protocol (JSON)
 */

import { ObjectId } from 'mongodb'
import type { CompiledQuery, WhereClause } from '../types'
import { Grammar } from './Grammar'

/**
 * MongoDB Query Protocol
 * Represents the structure passed from Grammar to Driver
 */
export interface MongoQueryProtocol {
  collection: string
  operation: 'find' | 'insert' | 'update' | 'delete' | 'aggregate' | 'count'
  filter?: Record<string, unknown>
  options?: Record<string, unknown>
  document?: Record<string, unknown> | Record<string, unknown>[]
  update?: Record<string, unknown>
  pipeline?: Record<string, unknown>[]
}

/**
 * Mongo Grammar
 * Transforms QueryBuilder state into MongoDB commands
 */
export class MongoGrammar extends Grammar {
  protected wrapChar = ''

  getPlaceholder(_index: number): string {
    return '?' // Not used in Mongo, handled by bindings mapping
  }

  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    _primaryKey: string
  ): string {
    return this.compileInsert(query, [values])
  }

  // ============================================================================
  // Protocol Compilers (Returns JSON string)
  // ============================================================================

  override compileSelect(query: CompiledQuery): string {
    // Check if it's an aggregate count query
    // The base query builder might optimize count() to select count(*)
    // We need to detect this intent.
    // However, QueryBuilder.count() calls aggregate().

    const filter = this.compileMongoWheres(query)
    const options: Record<string, unknown> = {}

    if (query.limit !== undefined) options.limit = query.limit
    if (query.offset !== undefined) options.skip = query.offset

    if (query.orders.length > 0) {
      const sort: Record<string, number> = {}
      for (const order of query.orders) {
        sort[order.column] = order.direction === 'asc' ? 1 : -1
      }
      options.sort = sort
    }

    if (query.columns.length > 0 && !query.columns.includes('*')) {
      const projection: Record<string, number> = {}
      for (const col of query.columns) {
        projection[col] = 1
      }
      options.projection = projection
    }

    const protocol: MongoQueryProtocol = {
      collection: query.table,
      operation: 'find',
      filter,
      options,
    }

    return JSON.stringify(protocol)
  }

  override compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    const protocol: MongoQueryProtocol = {
      collection: query.table,
      operation: 'insert',
      document: values,
    }
    return JSON.stringify(protocol)
  }

  override compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string {
    const filter = this.compileMongoWheres(query)
    const protocol: MongoQueryProtocol = {
      collection: query.table,
      operation: 'update',
      filter,
      update: { $set: values }, // Default to $set for now
    }
    return JSON.stringify(protocol)
  }

  override compileDelete(query: CompiledQuery): string {
    const filter = this.compileMongoWheres(query)
    const protocol: MongoQueryProtocol = {
      collection: query.table,
      operation: 'delete',
      filter,
    }
    return JSON.stringify(protocol)
  }

  override compileAggregate(query: CompiledQuery, aggregate: { function: string; column: string }): string {
    if (aggregate.function === 'count') {
      const filter = this.compileMongoWheres(query)
      const protocol: MongoQueryProtocol = {
        collection: query.table,
        operation: 'count',
        filter,
      }
      return JSON.stringify(protocol)
    }

    // For sum, avg, max, min, we need aggregation pipeline
    throw new Error(`Aggregate function '${aggregate.function}' not yet implemented for MongoDB`)
  }

  override compileTruncate(query: CompiledQuery): string {
    return this.compileDelete(query)
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Translate generic WhereClause[] to MongoDB Filter
   */
  private compileMongoWheres(query: CompiledQuery): Record<string, unknown> {
    if (query.wheres.length === 0) return {}

    const filter: Record<string, any> = {}
    // Need to map bindings to placeholders if we were using SQL
    // But here we have direct access via query.wheres?
    // Actually CompiledQuery in types definition keeps 'wheres' structure.
    // The base Grammar uses bindings offset.
    // We need to re-map the values from the bindings array or use the values directly if stored in WhereClause.
    // The current WhereClause type stores `value` or `values` directly!
    // So we don't need to look at query.bindingsList for basic wheres.

    for (const where of query.wheres) {
      if (where.type === 'basic') {
        this.compileBasicWhere(filter, where)
      } else if (where.type === 'in') {
        this.compileInWhere(filter, where)
      } else if (where.type === 'null') {
        this.compileNullWhere(filter, where)
      } else if (where.type === 'nested') {
        // Complex nested logic (AND/OR groups)
        // This is tricky because Mongo uses $or: [...] structure
        // Simplified: support top-level OR
        if (where.boolean === 'or') {
            if (!filter.$or) filter.$or = []
            // We'd need to re-parse the nested SQL or store nested structure better.
            // Current QueryBuilder compiles nested wheres to SQL string.
            // This is a limitation of the current generic QueryBuilder -> Grammar interface.
            // For MVP, we might skip complex nested ORs or need to enhance QueryBuilder to expose nested objects.
        }
      }
    }

    return filter
  }

  private normalizeValue(column: string, value: any): any {
      if ((column === '_id' || column === 'id') && typeof value === 'string' && value.length === 24) {
          try {
              return new ObjectId(value)
          } catch {
              return value
          }
      }
      return value
  }

  private compileBasicWhere(filter: Record<string, any>, where: WhereClause) {
    const col = this.normalizeColumn(where.column!)
    const val = this.normalizeValue(col, where.value)
    const op = where.operator ?? '='

    switch (op) {
      case '=':
        filter[col] = val
        break
      case '!=':
      case '<>':
        filter[col] = { $ne: val }
        break
      case '>':
        filter[col] = { ...filter[col], $gt: val }
        break
      case '>=':
        filter[col] = { ...filter[col], $gte: val }
        break
      case '<':
        filter[col] = { ...filter[col], $lt: val }
        break
      case '<=':
        filter[col] = { ...filter[col], $lte: val }
        break
      case 'like':
        // Convert SQL LIKE to Regex
        // %term% -> /term/
        if (typeof val === 'string') {
            const regex = new RegExp(`^${val.replace(/%/g, '.*')}$`, 'i')
            filter[col] = regex
        }
        break
    }
  }

  private compileInWhere(filter: Record<string, any>, where: WhereClause) {
    const col = this.normalizeColumn(where.column!)
    const op = where.not ? '$nin' : '$in'
    const values = (where.values ?? []).map(v => this.normalizeValue(col, v))
    filter[col] = { ...filter[col], [op]: values }
  }

  private compileNullWhere(filter: Record<string, any>, where: WhereClause) {
    const col = this.normalizeColumn(where.column!)
    const op = where.not ? '$ne' : '$eq'
    filter[col] = { ...filter[col], [op]: null }
  }

  private normalizeColumn(column: string): string {
    if (column === 'id') return '_id'
    return column
  }

  // ============================================================================
  // JSON Overrides
  // ============================================================================

  override compileJsonPath(column: string, value: unknown): string {
    // data->user->id => data.user.id
    const path = column.replace(/->/g, '.')
    // Return a special marker or construct a partial filter object?
    // Since compileJsonPath returns a string for WHERE RAW,
    // we return a JSON string that the driver will have to merge.
    // This is getting complex.
    // Better strategy: The WhereClause type 'raw' will contain this string.
    // We can interpret specific JSON patterns.
    return JSON.stringify({ [path]: value })
  }
}
