/**
 * Having Clause
 *
 * Handles HAVING operations
 */
import type { HavingClause as HavingClauseType, Operator } from '../../types'
import { Expression } from '../Expression'
/**
 * Having Clause
 * @description Handles the construction of HAVING clauses for SQL queries
 */
export declare class HavingClause {
  /** Internal storage for having clauses */
  private havings
  /** Bindings for having clauses */
  private bindings
  /**
   * Add a HAVING clause to the query
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @example
   * ```typescript
   * clause.having('count(*)', '>', 10)
   * ```
   */
  having(column: string, operator: Operator, value: unknown): void
  /**
   * Add a raw HAVING clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   */
  havingRaw(sql: string | Expression, bindings?: unknown[]): void
  /**
   * Get all having clauses
   *
   * @returns Array of having clauses
   */
  getHavings(): HavingClauseType[]
  /**
   * Get the bindings associated with this clause
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[]
  /**
   * Compile the HAVING clause to SQL
   *
   * @returns HAVING clause SQL string
   */
  toSQL(): string
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has any having conditions
   *
   * @returns True if having conditions exist
   */
  hasHavings(): boolean
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): HavingClause
}
