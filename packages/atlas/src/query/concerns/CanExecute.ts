import { DB } from '../../DB'
import type { ConnectionContract } from '../../types'
import { Expression } from '../Expression'
import { QueryBuilderError, RecordNotFoundError } from '../QueryBuilder'

/**
 * Trait for executing query results (READ, WRITE, AGGREGATE).
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanExecute {
  /**
   * Execute the query and get all results
   */
  async get(this: any): Promise<any[]> {
    const connection = this.connection as ConnectionContract
    const sql = this.grammar.compileSelect(this.getCompiledQuery())

    // Check cache
    const cache = DB.getCache()
    let cacheKey: string | undefined

    if (cache && this._cache) {
      cacheKey = this._cache.key ?? `orbit:query:${sql}:${JSON.stringify(this.bindingsList)}`
      if (cacheKey) {
        const cached = await cache.get<any[]>(cacheKey)
        if (cached) {
          return cached
        }
      }
    }

    const result = await connection.raw<any>(sql, this.bindingsList)

    // Store cache
    if (cache && this._cache && cacheKey) {
      await cache.set(cacheKey, result.rows, this._cache.ttl)
    }

    return result.rows
  }

  /**
   * Get the first result
   */
  async first(this: any): Promise<any | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] ?? null
  }

  /**
   * Get the first result or throw
   */
  async firstOrFail(this: any): Promise<any> {
    const result = await this.first()
    if (result === null) {
      throw new RecordNotFoundError()
    }
    return result
  }

  /**
   * Find a record by ID
   */
  async find(this: any, id: unknown, primaryKey = 'id'): Promise<any | null> {
    return this.where(primaryKey, '=', id).first()
  }

  /**
   * Find a record by ID or throw
   */
  async findOrFail(this: any, id: unknown, primaryKey = 'id'): Promise<any> {
    const result = await this.find(id, primaryKey)
    if (result === null) {
      throw new RecordNotFoundError(`Record with ${primaryKey}=${id} not found`)
    }
    return result
  }

  /**
   * Get a single column value from the first result
   */
  async value(this: any, column: string): Promise<any | null> {
    const result = await this.select(column).first()
    if (result === null) {
      return null
    }
    return (result as Record<string, unknown>)[column]
  }

  /**
   * Get an array of values from a single column
   */
  async pluck(this: any, column: string): Promise<any[]> {
    const results = await this.select(column).get()
    return results.map((row: any) => (row as Record<string, unknown>)[column])
  }

  /**
   * Check if any records exist
   */
  async exists(this: any): Promise<boolean> {
    const connection = this.connection as ConnectionContract
    const sql = this.grammar.compileExists(this.getCompiledQuery())
    const result = await connection.raw<{ exists: boolean }>(sql, this.bindingsList)
    return result.rows[0]?.exists ?? false
  }

  /**
   * Check if no records exist
   */
  async doesntExist(this: any): Promise<boolean> {
    return !(await this.exists())
  }

  /**
   * Get the count of records
   */
  async count(this: any, column = '*'): Promise<number> {
    const result = await this.aggregate('count', column)
    return result ?? 0
  }

  /**
   * Get the maximum value
   */
  async max(this: any, column: string): Promise<any | null> {
    return this.aggregate('max', column)
  }

  /**
   * Get the minimum value
   */
  async min(this: any, column: string): Promise<any | null> {
    return this.aggregate('min', column)
  }

  /**
   * Get the average value
   */
  async avg(this: any, column: string): Promise<number | null> {
    return this.aggregate('avg', column)
  }

  /**
   * Get the sum of values
   */
  async sum(this: any, column: string): Promise<number> {
    return (await this.aggregate('sum', column)) ?? 0
  }

  /**
   * Execute an aggregate function
   */
  protected async aggregate(this: any, func: string, column: string): Promise<number | null> {
    const connection = this.connection as ConnectionContract
    const sql = this.grammar.compileAggregate(this.getCompiledQuery(), { function: func, column })
    const result = await connection.raw<{ aggregate: number | null }>(sql, this.bindingsList)
    const value = result.rows[0]?.aggregate
    return value === null || value === undefined ? null : Number(value)
  }

  /**
   * Insert records
   */
  async insert(this: any, data: any | any[]): Promise<any[]> {
    const connection = this.connection as ConnectionContract
    const values = Array.isArray(data) ? data : [data]
    if (values.length === 0) return []

    const chunkSize = 1000
    const results: any[] = []

    if (values.length > chunkSize) {
      return await connection.transaction(async (trx: any) => {
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize)
          const chunkResult = await trx.table(this.tableName).insert(chunk)
          results.push(...chunkResult)
        }
        return results
      })
    }

    const allBindings: unknown[] = []
    for (const row of values) {
      allBindings.push(...Object.values(row))
    }

    const sql = this.grammar.compileInsert(this.getCompiledQuery(), values)
    const result = await connection.raw<any>(sql, allBindings)
    return result.rows
  }

  /**
   * Insert a record and get the ID
   */
  async insertGetId(this: any, data: any, primaryKey = 'id'): Promise<number | bigint> {
    const connection = this.connection as ConnectionContract
    const values = Object.values(data)
    const sql = this.grammar.compileInsertGetId(this.getCompiledQuery(), data, primaryKey)
    const result = await connection.raw<Record<string, number | bigint>>(sql, values)
    const id = result.rows[0]?.[primaryKey]
    if (id === undefined) {
      throw new QueryBuilderError('Failed to get insert ID')
    }
    return id
  }

  /**
   * Update records
   */
  async update(this: any, data: any): Promise<number> {
    const values: unknown[] = []
    for (const value of Object.values(data)) {
      if (value instanceof Expression) {
        values.push(...value.getBindings())
      } else {
        values.push(value)
      }
    }

    const allBindings = [...values, ...this.bindingsList]
    const compiled = this.getCompiledQuery()
    compiled.bindings = allBindings

    const sql = this.grammar.compileUpdate(compiled, data)
    const result = await this.connection.getDriver().execute(sql, allBindings)
    return result.affectedRows
  }

  /**
   * Update JSON column partially
   */
  async updateJson(this: any, column: string, value: unknown): Promise<number> {
    const sql = this.grammar.compileUpdateJson(this.getCompiledQuery(), column, value)
    const result = await this.connection.getDriver().execute(sql, [value, ...this.bindingsList])
    return result.affectedRows
  }

  /**
   * Delete records
   */
  async delete(this: any): Promise<number> {
    const sql = this.grammar.compileDelete(this.getCompiledQuery())
    const result = await this.connection.getDriver().execute(sql, this.bindingsList)
    return result.affectedRows
  }

  /**
   * Truncate the table
   */
  async truncate(this: any): Promise<void> {
    const sql = this.grammar.compileTruncate(this.getCompiledQuery())
    await this.connection.getDriver().execute(sql)
  }

  /**
   * Increment a column value
   */
  async increment(this: any, column: string, amount = 1, extra: any = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} + ${amount}`),
    }
    return this.update(data)
  }

  /**
   * Decrement a column value
   */
  async decrement(this: any, column: string, amount = 1, extra: any = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} - ${amount}`),
    }
    return this.update(data)
  }

  /**
   * Insert or update records
   */
  async upsert(
    this: any,
    data: any | any[],
    _uniqueBy: string | string[],
    _update?: string[]
  ): Promise<number> {
    // Basic implementation (might depend on grammar later)
    const values = Array.isArray(data) ? data : [data]
    const result = await this.insert(values)
    return result.length
  }
}
