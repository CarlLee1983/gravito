/**
 * Select Clause
 *
 * Handles SELECT and DISTINCT functionality
 */

export class SelectClause {
  private columns: string[] = ['*']
  private distinct = false

  /**
   * Set columns to select
   *
   * @param columns - Column names
   */
  setColumns(...columns: string[]): void {
    this.columns = columns.length > 0 ? columns : ['*']
  }

  /**
   * Add a raw SELECT expression
   *
   * @param expression - SQL expression
   * @param bindings - Bindings for the expression
   */
  addRaw(expression: string, bindings: unknown[] = []): void {
    this.columns.push(expression)
    for (const b of bindings) {
      this.bindingsList?.push(b)
    }
  }

  /**
   * Set DISTINCT flag
   */
  setDistinct(): void {
    this.distinct = true
  }

  /**
   * Get selected columns
   */
  getColumns(): string[] {
    return this.columns
  }

  /**
   * Check if DISTINCT is set
   */
  isDistinct(): boolean {
    return this.distinct
  }

  /**
   * Compile to SQL
   *
   * @returns SELECT clause SQL
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
      return col.includes('(') ? col : `"${col}"`
    })

    sql += ` ${columns.join(', ')}`

    return sql
  }

  /**
   * Reset clause state
   */
  reset(): void {
    this.columns = ['*']
    this.distinct = false
  }

  /**
   * Get bindings
   */
  getBindings(): unknown[] {
    return this.bindingsList || []
  }

  /**
   * Set bindings list reference
   */
  setBindingsList(bindings: unknown[]): void {
    this.bindingsList = bindings
  }

  private bindingsList?: unknown[]
}
