/**
 * Select Clause
 * @description Handles the construction of SELECT and DISTINCT clauses for SQL queries
 */
export declare class SelectClause {
  /** Array of columns to select, defaults to all columns ('*') */
  private columns
  /** Whether to apply the DISTINCT keyword to the query */
  private distinct
  /** Bindings for raw expressions */
  private bindings
  /**
   * Set the columns to be selected
   *
   * @param columns - List of column names
   * @example
   * ```typescript
   * clause.setColumns('id', 'name', 'email')
   * ```
   */
  setColumns(...columns: string[]): void
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
  addRaw(expression: string, bindings?: unknown[]): void
  /**
   * Enable the DISTINCT keyword for the query
   */
  setDistinct(): void
  /**
   * Get the list of selected columns
   *
   * @returns Array of column names or expressions
   */
  getColumns(): string[]
  /**
   * Check if the DISTINCT keyword is enabled
   *
   * @returns True if distinct is set
   */
  isDistinct(): boolean
  /**
   * Compile the SELECT clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string
  /**
   * Reset the clause state to its default values
   */
  reset(): void
  /**
   * Get the bindings associated with this clause
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[]
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): SelectClause
}
