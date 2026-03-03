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
export declare class JoinManager {
  /** Internal storage for join conditions */
  private joins
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
  add(type: JoinType, table: string, first: string, operator: string, second: string): void
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
  left(table: string, first: string, operator: string, second: string): void
  /**
   * Add a RIGHT JOIN condition
   *
   * @param table - Table to join
   * @param first - First column for the ON condition
   * @param operator - Join operator
   * @param second - Second column for the ON condition
   */
  right(table: string, first: string, operator: string, second: string): void
  /**
   * Add a CROSS JOIN condition
   *
   * @param table - Table to join
   * @param first - First column for the ON condition
   * @param operator - Join operator
   * @param second - Second column for the ON condition
   */
  cross(table: string, first: string, operator: string, second: string): void
  /**
   * Get all joins
   *
   * @returns Array of joins
   */
  getJoins(): JoinClause[]
  /**
   * Compile the JOIN clause to SQL
   *
   * @returns JOIN clause SQL string
   */
  toSQL(): string
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has any joins
   *
   * @returns True if joins exist
   */
  hasJoins(): boolean
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): JoinManager
}
