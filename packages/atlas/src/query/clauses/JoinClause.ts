/**
 * Join Clause
 *
 * Handles JOIN operations
 */

import type { JoinClause, JoinType } from '../../types'

/**
 * Join Manager
 * @description Handles the construction of JOIN clauses for SQL queries
 */
export class JoinManager {
  /** Internal storage for join conditions */
  private joins: JoinClause[] = []

  /**
   * Add a JOIN condition to the query
   *
   * @param type - Join type (INNER, LEFT, RIGHT, FULL, CROSS)
   * @param table - Table to join
   * @param first - First column for the ON condition
   * @param operator - Join operator (=, !=, >, <, etc.)
   * @param second - Second column for the ON condition
   * @example
   * ```typescript
   * manager.add('inner', 'posts', 'users.id', '=', 'posts.user_id')
   * ```
   */
  add(type: JoinType, table: string, first: string, operator: string, second: string): void {
    this.joins.push({
      type,
      table,
      first,
      operator,
      second,
    })
  }

  /**
   * Add a LEFT JOIN condition
   *
   * @param table - Table to join
   * @param first - First column for the ON condition
   * @param operator - Join operator
   * @param second - Second column for the ON condition
   * @example
   * ```typescript
   * manager.left('posts', 'users.id', '=', 'posts.user_id')
   * ```
   */
  left(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN condition
   *
   * @param table - Table to join
   * @param first - First column for the ON condition
   * @param operator - Join operator
   * @param second - Second column for the ON condition
   */
  right(table: string, first: string, operator: string, second: string): void {
    this.add('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN condition
   *
   * @param table - Table to join
   */
  cross(table: string): void {
    this.add('cross', table, '', '', '')
  }

  /**
   * Get all joins
   *
   * @returns Array of joins
   */
  getJoins(): JoinClause[] {
    return this.joins.map((j) => ({ ...j }))
  }

  /**
   * Compile the JOIN clause to SQL
   *
   * @returns JOIN clause SQL string
   */
  toSQL(): string {
    if (this.joins.length === 0) {
      return ''
    }

    return this.joins
      .map((join) => {
        const type = join.type.toUpperCase()
        const table = join.table.includes('(') ? join.table : `"${join.table}"`

        if (join.type === 'cross') {
          return `${type} JOIN ${table}`
        }

        const first = join.first.includes('(') ? join.first : `"${join.first}"`
        const second = join.second.includes('(') ? join.second : `"${join.second}"`

        return `${type} JOIN ${table} ON ${first} ${join.operator} ${second}`
      })
      .join(' ')
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.joins = []
  }

  /**
   * Check if the clause has any joins
   *
   * @returns True if joins exist
   */
  hasJoins(): boolean {
    return this.joins.length > 0
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): JoinManager {
    const clone = new JoinManager()
    clone.joins = [...this.joins]
    return clone
  }
}
