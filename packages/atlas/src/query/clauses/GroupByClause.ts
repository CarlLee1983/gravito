/**
 * Group By Clause
 *
 * Handles GROUP BY operations
 */

/**
 * Group By Clause
 * @description Handles the construction of GROUP BY clauses for SQL queries
 */
export class GroupByClause {
  /** Array of columns to group by */
  private groups: string[] = []

  /**
   * Add GROUP BY columns to the query
   *
   * @param columns - List of column names
   * @example
   * ```typescript
   * clause.groupBy('category', 'status')
   * ```
   */
  groupBy(...columns: string[]): void {
    this.groups.push(...columns)
  }

  /**
   * Get all group by columns
   *
   * @returns Array of column names
   */
  getGroups(): string[] {
    return [...this.groups]
  }

  /**
   * Compile the GROUP BY clause to SQL
   *
   * @returns GROUP BY clause SQL string
   */
  toSQL(): string {
    if (this.groups.length === 0) {
      return ''
    }

    const columns = this.groups.map((col) => {
      return col.includes('(') ? col : `"${col}"`
    })

    return `GROUP BY ${columns.join(', ')}`
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.groups = []
  }

  /**
   * Check if the clause has any groups
   *
   * @returns True if groups exist
   */
  hasGroups(): boolean {
    return this.groups.length > 0
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): GroupByClause {
    const clone = new GroupByClause()
    clone.groups = [...this.groups]
    return clone
  }
}
