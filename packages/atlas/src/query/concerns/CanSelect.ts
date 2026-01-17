import { Expression } from '../Expression'

/**
 * Trait for managing SQL SELECT clauses and caching.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanSelect {
  /**
   * Set the columns to select
   */
  select(this: any, ...columns: string[]): this {
    this.columns = columns.length > 0 ? columns : ['*']
    return this
  }

  /**
   * Add a raw SELECT expression
   */
  selectRaw(this: any, sql: string | Expression, bindings: unknown[] = []): this {
    if (sql instanceof Expression) {
      this.columns.push(sql.getValue())
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.columns.push(new Expression(sql, bindings).getValue())
      this.bindingsList.push(...bindings)
    }
    return this
  }

  /**
   * Add DISTINCT to the query
   */
  distinct(this: any): this {
    this.distinctValue = true
    return this
  }

  /**
   * Cache the query result
   */
  cache(this: any, ttl: number, key?: string): this {
    if (key !== undefined) {
      this._cache = { ttl, key }
    } else {
      this._cache = { ttl }
    }
    return this
  }
}
