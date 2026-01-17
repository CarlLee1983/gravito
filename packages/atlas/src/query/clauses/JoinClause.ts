/**
 * Join Clause
 *
 * Handles JOIN operations
 */

import type { JoinClause as JoinClauseType, JoinType } from '../../types'

export interface JoinCondition {
  type: JoinType
  table: string
  first: string
  operator: string
  second: string
}

export class JoinClauseBuilder {
  private joins: JoinClauseType[] = []

  /**
   * Add a JOIN
   *
   * @param type - Join type (INNER, LEFT, RIGHT, FULL)
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator (=, !=, >, <, etc.)
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
   * Add a LEFT JOIN
   */
  left(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN
   */
  right(table: string, first: string, operator: string, second: string): void {
    this.add('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN
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
   * Compile to SQL
   *
   * @returns JOIN clause SQL
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
   * Reset clause state
   */
  reset(): void {
    this.joins = []
  }

  /**
   * Check if clause has joins
   */
  hasJoins(): boolean {
    return this.joins.length > 0
  }
}

export class JoinClause {
  private joins: JoinClauseType[] = []

  /**
   * Add a JOIN
   *
   * @param type - Join type (INNER, LEFT, RIGHT, FULL)
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator (=, !=, >, <, etc.)
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
   * Add a LEFT JOIN
   */
  left(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN
   */
  right(table: string, first: string, operator: string, second: string): void {
    this.add('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN
   */
  cross(table: string, first: string, operator: string, second: string): void {
    this.add('cross', table, first, operator, second)
  }

  /**
   * Add a LEFT OUTER JOIN (uses LEFT with condition handling)
   */
  leftOuter(table: string, first: string, operator: string, second: string): void {
    this.add('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT OUTER JOIN (uses RIGHT with condition handling)
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
   * Compile to SQL
   *
   * @returns JOIN clause SQL
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
   * Reset clause state
   */
  reset(): void {
    this.joins = []
  }

  /**
   * Check if clause has joins
   */
  hasJoins(): boolean {
    return this.joins.length > 0
  }
}
