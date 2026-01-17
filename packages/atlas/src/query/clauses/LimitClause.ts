/**
 * Limit Clause
 *
 * Handles LIMIT and OFFSET functionality
 */

export class LimitClause {
  private limitValue?: number
  private offsetValue?: number

  /**
   * Set LIMIT value
   *
   * @param value - Limit value
   */
  setLimit(value: number): void {
    this.limitValue = value
  }

  /**
   * Set OFFSET value
   *
   * @param value - Offset value
   */
  setOffset(value: number): void {
    this.offsetValue = value
  }

  /**
   * Get LIMIT value
   *
   * @returns Limit value
   */
  getLimit(): number | undefined {
    return this.limitValue
  }

  /**
   * Get OFFSET value
   *
   * @returns Offset value
   */
  getOffset(): number | undefined {
    return this.offsetValue
  }

  /**
   * Compile to SQL
   *
   * @returns LIMIT/OFFSET clause SQL
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
   * Reset clause state
   */
  reset(): void {
    this.limitValue = undefined
    this.offsetValue = undefined
  }

  /**
   * Check if clause has LIMIT
   */
  hasLimit(): boolean {
    return this.limitValue !== undefined
  }

  /**
   * Check if clause has OFFSET
   */
  hasOffset(): boolean {
    return this.offsetValue !== undefined
  }

  /**
   * Set take (alias for limit)
   */
  take(value: number): void {
    this.setLimit(value)
  }

  /**
   * Set skip (alias for offset)
   */
  skip(value: number): void {
    this.setOffset(value)
  }
}
