/**
 * Limit Clause
 * @description Handles the construction of LIMIT and OFFSET clauses for SQL queries
 */
export class LimitClause {
  /** The maximum number of records to return */
  private limitValue?: number
  /** The number of records to skip before starting to return results */
  private offsetValue?: number

  /**
   * Set the LIMIT value
   *
   * @param value - Maximum number of records
   * @example
   * ```typescript
   * clause.setLimit(10)
   * ```
   */
  setLimit(value: number): void {
    this.limitValue = value
  }

  /**
   * Set the OFFSET value
   *
   * @param value - Number of records to skip
   * @example
   * ```typescript
   * clause.setOffset(20)
   * ```
   */
  setOffset(value: number): void {
    this.offsetValue = value
  }

  /**
   * Get the current LIMIT value
   *
   * @returns The limit value or undefined if not set
   */
  getLimit(): number | undefined {
    return this.limitValue
  }

  /**
   * Get the current OFFSET value
   *
   * @returns The offset value or undefined if not set
   */
  getOffset(): number | undefined {
    return this.offsetValue
  }

  /**
   * Compile the LIMIT/OFFSET clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string {
    const parts: string[] = []

    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`)
    }

    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`)
    }

    return parts.join(' ')
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.limitValue = undefined
    this.offsetValue = undefined
  }

  /**
   * Check if the clause has a LIMIT value set
   *
   * @returns True if limit is set
   */
  hasLimit(): boolean {
    return this.limitValue !== undefined
  }

  /**
   * Check if the clause has an OFFSET value set
   *
   * @returns True if offset is set
   */
  hasOffset(): boolean {
    return this.offsetValue !== undefined
  }

  /**
   * Set the number of records to take (alias for limit)
   *
   * @param value - Number of records
   */
  take(value: number): void {
    this.setLimit(value)
  }

  /**
   * Set the number of records to skip (alias for offset)
   *
   * @param value - Number of records
   */
  skip(value: number): void {
    this.setOffset(value)
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): LimitClause {
    const clone = new LimitClause()
    clone.setLimit(this.limitValue!)
    clone.setOffset(this.offsetValue!)
    // If undefined, setLimit/setOffset might set it to undefined or strict number?
    // My implementation: setLimit(value: number).
    // So I should check if defined.
    // Actually, I can access private properties directly.
    clone.limitValue = this.limitValue
    clone.offsetValue = this.offsetValue
    return clone
  }
}
