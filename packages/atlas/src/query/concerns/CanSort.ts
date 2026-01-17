import type { OrderDirection } from '../../types'
import { Expression } from '../Expression'

/**
 * Trait for managing SQL ORDER BY, LIMIT, and OFFSET.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanSort {
  /**
   * Add an ORDER BY clause
   */
  orderBy(this: any, column: string, direction: OrderDirection = 'asc'): this {
    this.orders.push({ column, direction })
    return this
  }

  /**
   * Add an ORDER BY DESC clause
   */
  orderByDesc(this: any, column: string): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add a raw ORDER BY clause
   */
  orderByRaw(this: any, sql: string | Expression, bindings: unknown[] = []): this {
    if (sql instanceof Expression) {
      this.orders.push({ column: sql.getValue(), direction: 'asc' })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.orders.push({ column: new Expression(sql, bindings).getValue(), direction: 'asc' })
      this.bindingsList.push(...bindings)
    }
    return this
  }

  /**
   * Order by latest (created_at DESC)
   */
  latest(this: any, column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Order by oldest (created_at ASC)
   */
  oldest(this: any, column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  /**
   * Set the LIMIT
   */
  limit(this: any, value: number): this {
    this.limitValue = value
    return this
  }

  /**
   * Set the OFFSET
   */
  offset(this: any, value: number): this {
    this.offsetValue = value
    return this
  }

  /**
   * Alias for offset
   */
  skip(this: any, value: number): this {
    return this.offset(value)
  }

  /**
   * Alias for limit
   */
  take(this: any, value: number): this {
    return this.limit(value)
  }
}
