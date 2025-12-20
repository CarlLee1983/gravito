/**
 * PostgreSQL Grammar
 * @description SQL grammar implementation for PostgreSQL
 */

import type { CompiledQuery } from '../types'
import { Grammar } from './Grammar'

/**
 * PostgreSQL Grammar
 * Implements PostgreSQL-specific SQL syntax
 */
export class PostgresGrammar extends Grammar {
  /**
   * PostgreSQL uses double quotes for identifiers
   */
  protected wrapChar = '"'

  /**
   * Get placeholder for PostgreSQL ($1, $2, $3...)
   */
  getPlaceholder(index: number): string {
    return `$${index + 1}`
  }

  /**
   * Compile INSERT and return ID using RETURNING clause
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string {
    // Use base class compileInsert to avoid double RETURNING clause
    const insertSql = super.compileInsert(query, [values])
    return `${insertSql} RETURNING ${this.wrapColumn(primaryKey)}`
  }

  /**
   * Compile INSERT with RETURNING clause for PostgreSQL
   */
  override compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    const baseSql = super.compileInsert(query, values)
    // PostgreSQL supports RETURNING for all inserts
    return `${baseSql} RETURNING *`
  }

  /**
   * Compile UPDATE with RETURNING clause for PostgreSQL
   */
  override compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string {
    const baseSql = super.compileUpdate(query, values)
    return baseSql
  }

  /**
   * Compile TRUNCATE with CASCADE option for PostgreSQL
   */
  override compileTruncate(query: CompiledQuery): string {
    return `TRUNCATE TABLE ${this.wrapTable(query.table)} RESTART IDENTITY CASCADE`
  }

  /**
   * PostgreSQL-specific: Compile UPSERT using ON CONFLICT
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string {
    const insertSql = super.compileInsert(query, values).replace(' RETURNING *', '')
    const conflictColumns = uniqueBy.map((col) => this.wrapColumn(col)).join(', ')

    if (update.length === 0) {
      return `${insertSql} ON CONFLICT (${conflictColumns}) DO NOTHING`
    }

    const updateSet = update
      .map((col) => `${this.wrapColumn(col)} = EXCLUDED.${this.wrapColumn(col)}`)
      .join(', ')

    return `${insertSql} ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateSet} RETURNING *`
  }

  /**
   * PostgreSQL-specific: Compile locking clause
   */
  compileLock(mode: 'update' | 'share'): string {
    return mode === 'share' ? 'FOR SHARE' : 'FOR UPDATE'
  }

  /**
   * Override offset placeholders for PostgreSQL
   */
  protected override offsetPlaceholders(sql: string, offset: number): string {
    // PostgreSQL uses $1, $2, etc. - we need to offset these
    return sql.replace(/\$(\d+)/g, (_, num) => `$${Number.parseInt(num, 10) + offset}`)
  }

  /**
   * Compile a lateral eager load query for PostgreSQL
   */
  override compileLateralEagerLoad(
    _table: string,
    foreignKey: string,
    parentKeys: unknown[],
    query: CompiledQuery
  ): { sql: string; bindings: unknown[] } {
    const wrappedFk = this.wrapColumn(foreignKey)

    // 1. Create parents CTE/subquery using unnest
    // We use unnest($1::type[]) to turn an array into rows efficiently
    // Determination of type could be sophisticated, but usually int or uuid.
    // We'll stick to a simple placeholder and let the driver handle the array binding.
    const pSub = `(SELECT unnest($1::${this.guessType(parentKeys)}) AS parent_id) p`

    // 2. Compile the inner query
    // We need to inject the WHERE foreignKey = p.parent_id
    // But since the inner query might already have wheres, we need to be careful.
    const innerQuery = { ...query }
    const select = this.compileColumns(innerQuery)
    const from = this.compileFrom(innerQuery)
    const joins = innerQuery.joins.length > 0 ? ` ${this.compileJoins(innerQuery)}` : ''

    // The inner WHERE must include the link to p.parent_id
    // and account for the fact that $1 is already used for parentKeys
    const innerWheresRaw = this.compileWheres(innerQuery, 1) // Offset by 1 for parentKeys
    const linkClause = `${wrappedFk} = p.parent_id`
    const wheres = innerWheresRaw
      ? `${innerWheresRaw} AND ${linkClause}`
      : `WHERE ${linkClause}`

    const orders = innerQuery.orders.length > 0 ? ` ${this.compileOrders(innerQuery)}` : ''
    const limit = innerQuery.limit !== undefined ? ` ${this.compileLimit(innerQuery)}` : ''
    const offset = innerQuery.offset !== undefined ? ` ${this.compileOffset(innerQuery)}` : ''

    const sql = `SELECT l.* FROM ${pSub} CROSS JOIN LATERAL (${select} ${from}${joins} ${wheres}${orders}${limit}${offset}) l`

    return {
      sql,
      bindings: [parentKeys, ...innerQuery.bindings],
    }
  }

  /**
   * Guess the PostgreSQL type for an array of values
   */
  protected guessType(values: unknown[]): string {
    if (values.length === 0) return 'text'
    const first = values[0]
    if (typeof first === 'number') return 'int'
    if (typeof first === 'string' && /^[0-9a-f-]{36}$/i.test(first)) return 'uuid'
    return 'text'
  }
}
