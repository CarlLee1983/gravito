/**
 * Join Clause
 *
 * Handles JOIN operations
 */

import type { JoinClause as JoinClauseType, JoinType } from '../../types'

/**
 * Join Condition Interface
 * @description Represents a single JOIN condition in a SQL query
 */
export interface JoinCondition {
  /** Join type (INNER, LEFT, RIGHT, FULL, CROSS) */
  type: JoinType
  /** Table to join with */
  table: string
  /** First column in the ON condition (usually from the primary table) */
  first: string
  /** Comparison operator (e.g., '=', '!=', '>', '<') */
  operator: string
  /** Second column in the ON condition (usually from the joined table) */
  second: string
}

/**
 * Join Clause Builder
 * @description Handles the construction of JOIN clauses for SQL queries
 */
export class JoinClauseBuilder {
  /** Internal storage for join conditions */
  private joins: JoinClauseType[] = []

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
   * builder.add('inner', 'posts', 'users.id', '=', 'posts.user_id')
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
   * builder.left('posts', 'users.id', '=', 'posts.user_id')
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
   * @param first - First column for the ON condition
   * @param operator - Join operator
   * @param second - Second column for the ON condition
   */
  cross(table: string, first: string, operator: string, second: string): void {
    this.add('cross', table, first, operator, second)
  }

  /**
   * Get all joins
   *
   * @returns Array of joins
   */
  getJoins(): JoinClauseType[] {
    return this.joins
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
}

/**
 * Join Clause
 * @description Represents a collection of JOIN operations in a query
 */
export class JoinClause {
  /** Internal storage for join conditions */
  private joins: JoinClauseType[] = []

  /**
   * Add a JOIN condition
   *
   * @param type - Join type
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
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
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   */
  left(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN condition
   *
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   */
  right(table: string, first: string, operator: string, second: string): void {
    this.add('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN condition
   *
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   */
  cross(table: string, first: string, operator: string, second: string): void {
    this.add('cross', table, first, operator, second)
  }

  /**
   * Add a LEFT OUTER JOIN condition
   *
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   */
  leftOuter(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT OUTER JOIN condition
   *
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   */
  rightOuter(table: string, first: string, operator: string, second: string): void {
    this.add('right', table, first, operator, second)
  }

  /**
   * Get all joins
   *
   * @returns Array of joins
   */
  getJoins(): JoinClauseType[] {
    return this.joins
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
}
