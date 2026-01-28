/**
 * Order By Clause
 *
 * Handles ORDER BY operations
 */

import type { OrderClause as OrderClauseType, OrderDirection } from '../../types'
import { Expression } from '../Expression'

/**
 * Order By Clause
 * @description Handles the construction of ORDER BY clauses for SQL queries
 */
export class OrderByClause {
  /** Internal storage for order by clauses */
  private orders: OrderClauseType[] = []
  /** Bindings for raw order clauses */
  private bindings: unknown[] = []

  /**
   * Add an ORDER BY clause to the query
   *
   * @param column - Column name
   * @param direction - Sort direction ('asc' or 'desc')
   * @example
   * ```typescript
   * clause.orderBy('created_at', 'desc')
   * ```
   */
  orderBy(column: string, direction: OrderDirection = 'asc'): void {
    this.orders.push({ column, direction })
  }

  /**
   * Add a raw ORDER BY clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   */
  orderByRaw(sql: string | Expression, bindings: unknown[] = []): void {
    if (sql instanceof Expression) {
      this.orders.push({ column: sql.getValue(), direction: 'asc' })
      this.bindings.push(...sql.getBindings())
    } else {
      this.orders.push({ column: new Expression(sql, bindings).getValue(), direction: 'asc' })
      this.bindings.push(...bindings)
    }
  }

  /**
   * Get all order clauses
   *
   * @returns Array of order clauses
   */
  getOrders(): OrderClauseType[] {
    return this.orders
  }

  /**
   * Get the bindings associated with this clause
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[] {
    return this.bindings
  }

  /**
   * Compile the ORDER BY clause to SQL
   *
   * @returns ORDER BY clause SQL string
   */
  toSQL(): string {
    if (this.orders.length === 0) {
      return ''
    }

    const compiled = this.orders
      .map((order) => {
        // Raw expressions are already handled in orderByRaw
        const column = order.column.includes('(') ? order.column : `"${order.column}"`
        return `${column} ${order.direction.toUpperCase()}`
      })
      .join(', ')

    return `ORDER BY ${compiled}`
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.orders = []
    this.bindings = []
  }

  /**
   * Check if the clause has any order conditions
   *
   * @returns True if order conditions exist
   */
  hasOrders(): boolean {
    return this.orders.length > 0
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): OrderByClause {
    const clone = new OrderByClause()
    clone.orders = [...this.orders]
    clone.bindings = [...this.bindings]
    return clone
  }
}
