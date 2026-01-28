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
export class HavingClause {
  /** Internal storage for having clauses */
  private havings: HavingClauseType[] = []
  /** Bindings for having clauses */
  private bindings: unknown[] = []

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
  having(column: string, operator: Operator, value: unknown): void {
    this.havings.push({
      type: 'basic',
      column,
      operator,
      value,
      boolean: 'and',
    })
    this.bindings.push(value)
  }

  /**
   * Add a raw HAVING clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   */
  havingRaw(sql: string | Expression, bindings: unknown[] = []): void {
    if (sql instanceof Expression) {
      this.havings.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'and',
      })
      this.bindings.push(...sql.getBindings())
    } else {
      this.havings.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'and',
      })
      this.bindings.push(...bindings)
    }
  }

  /**
   * Get all having clauses
   *
   * @returns Array of having clauses
   */
  getHavings(): HavingClauseType[] {
    return this.havings
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
   * Compile the HAVING clause to SQL
   *
   * @returns HAVING clause SQL string
   */
  toSQL(): string {
    if (this.havings.length === 0) {
      return ''
    }

    const compiled = this.havings
      .map((having, index) => {
        const prefix = index > 0 ? ` ${having.boolean.toUpperCase()} ` : ''

        if (having.type === 'raw') {
          return `${prefix}${having.sql}`
        }

        const column = having.column?.includes('(') ? having.column : `"${having.column}"`
        return `${prefix}${column} ${having.operator} ?`
      })
      .join('')

    return `HAVING ${compiled}`
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.havings = []
    this.bindings = []
  }

  /**
   * Check if the clause has any having conditions
   *
   * @returns True if having conditions exist
   */
  hasHavings(): boolean {
    return this.havings.length > 0
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): HavingClause {
    const clone = new HavingClause()
    clone.havings = [...this.havings]
    clone.bindings = [...this.bindings]
    return clone
  }
}
