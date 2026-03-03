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
export declare class OrderByClause {
  /** Internal storage for order by clauses */
  private orders
  /** Bindings for raw order clauses */
  private bindings
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
  orderBy(column: string, direction?: OrderDirection): void
  /**
   * Add a raw ORDER BY clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   */
  orderByRaw(sql: string | Expression, bindings?: unknown[]): void
  /**
   * Get all order clauses
   *
   * @returns Array of order clauses
   */
  getOrders(): OrderClauseType[]
  /**
   * Get the bindings associated with this clause
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[]
  /**
   * Compile the ORDER BY clause to SQL
   *
   * @returns ORDER BY clause SQL string
   */
  toSQL(): string
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has any order conditions
   *
   * @returns True if order conditions exist
   */
  hasOrders(): boolean
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): OrderByClause
}
