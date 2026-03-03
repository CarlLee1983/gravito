/**
 * Group By Clause
 *
 * Handles GROUP BY operations
 */
/**
 * Group By Clause
 * @description Handles the construction of GROUP BY clauses for SQL queries
 */
export declare class GroupByClause {
  /** Array of columns to group by */
  private groups
  /**
   * Add GROUP BY columns to the query
   *
   * @param columns - List of column names
   * @example
   * ```typescript
   * clause.groupBy('category', 'status')
   * ```
   */
  groupBy(...columns: string[]): void
  /**
   * Get all group by columns
   *
   * @returns Array of column names
   */
  getGroups(): string[]
  /**
   * Compile the GROUP BY clause to SQL
   *
   * @returns GROUP BY clause SQL string
   */
  toSQL(): string
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has any groups
   *
   * @returns True if groups exist
   */
  hasGroups(): boolean
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): GroupByClause
}
