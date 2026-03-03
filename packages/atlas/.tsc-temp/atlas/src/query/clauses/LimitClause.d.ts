/**
 * Limit Clause
 * @description Handles the construction of LIMIT and OFFSET clauses for SQL queries
 */
export declare class LimitClause {
  /** The maximum number of records to return */
  private limitValue?
  /** The number of records to skip before starting to return results */
  private offsetValue?
  /**
   * Set the LIMIT value
   *
   * @param value - Maximum number of records
   * @example
   * ```typescript
   * clause.setLimit(10)
   * ```
   */
  setLimit(value: number): void
  /**
   * Set the OFFSET value
   *
   * @param value - Number of records to skip
   * @example
   * ```typescript
   * clause.setOffset(20)
   * ```
   */
  setOffset(value: number): void
  /**
   * Get the current LIMIT value
   *
   * @returns The limit value or undefined if not set
   */
  getLimit(): number | undefined
  /**
   * Get the current OFFSET value
   *
   * @returns The offset value or undefined if not set
   */
  getOffset(): number | undefined
  /**
   * Compile the LIMIT/OFFSET clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has a LIMIT value set
   *
   * @returns True if limit is set
   */
  hasLimit(): boolean
  /**
   * Check if the clause has an OFFSET value set
   *
   * @returns True if offset is set
   */
  hasOffset(): boolean
  /**
   * Set the number of records to take (alias for limit)
   *
   * @param value - Number of records
   */
  take(value: number): void
  /**
   * Set the number of records to skip (alias for offset)
   *
   * @param value - Number of records
   */
  skip(value: number): void
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): LimitClause
}
