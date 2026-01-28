/**
 * Select Clause
 * @description Handles the construction of SELECT and DISTINCT clauses for SQL queries
 */
export class SelectClause {
  /** Array of columns to select, defaults to all columns ('*') */
  private columns: string[] = ['*']
  /** Whether to apply the DISTINCT keyword to the query */
  private distinct = false
  /** Bindings for raw expressions */
  private bindings: unknown[] = []

  /**
   * Set the columns to be selected
   *
   * @param columns - List of column names
   * @example
   * ```typescript
   * clause.setColumns('id', 'name', 'email')
   * ```
   */
  setColumns(...columns: string[]): void {
    this.columns = columns.length > 0 ? columns : ['*']
  }

  /**
   * Add a raw SQL expression to the SELECT clause
   *
   * @param expression - Raw SQL string
   * @param bindings - Bindings for the expression
   * @example
   * ```typescript
   * clause.addRaw('COUNT(*) as total')
   * ```
   */
  addRaw(expression: string, bindings: unknown[] = []): void {
    this.columns.push(expression)
    this.bindings.push(...bindings)
  }

  /**
   * Enable the DISTINCT keyword for the query
   */
  setDistinct(): void {
    this.distinct = true
  }

  /**
   * Get the list of selected columns
   *
   * @returns Array of column names or expressions
   */
  getColumns(): string[] {
    return [...this.columns]
  }

  /**
   * Check if the DISTINCT keyword is enabled
   *
   * @returns True if distinct is set
   */
  isDistinct(): boolean {
    return this.distinct
  }

  /**
   * Compile the SELECT clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string {
    let sql = 'SELECT'

    if (this.distinct) {
      sql += ' DISTINCT'
    }

    const columns = this.columns.map((col) => {
      if (col === '*') {
        return '*'
      }
      return col.includes('(') || col.includes(' as ') || col.includes(' AS ') ? col : `"${col}"`
    })

    sql += ` ${columns.join(', ')}`

    return sql
  }

  /**
   * Reset the clause state to its default values
   */
  reset(): void {
    this.columns = ['*']
    this.distinct = false
    this.bindings = []
  }

  /**
   * Get the bindings associated with this clause
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[] {
    return [...this.bindings]
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): SelectClause {
    const clone = new SelectClause()
    clone.columns = [...this.columns]
    clone.distinct = this.distinct
    clone.bindings = [...this.bindings]
    return clone
  }
}
