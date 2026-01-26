/**
 * Raw SQL Expression
 * @description Represents a raw SQL expression that should not be escaped by the query builder.
 * Use this for complex SQL fragments, function calls, or database-specific syntax.
 */
export class Expression {
  /**
   * Create a new Expression instance
   *
   * @param sql - The raw SQL string
   * @param bindings - Optional array of bindings for the expression
   */
  constructor(
    private readonly sql: string,
    private readonly bindings: unknown[] = []
  ) {}

  /**
   * Get the raw SQL string
   *
   * @returns The SQL string
   */
  getValue(): string {
    return this.sql
  }

  /**
   * Get the bindings associated with this expression
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[] {
    return this.bindings
  }

  /**
   * Convert the expression to its SQL string representation
   *
   * @returns The SQL string
   */
  toString(): string {
    return this.sql
  }
}

/**
 * Create a raw SQL expression
 *
 * @param sql - The raw SQL string
 * @param bindings - Optional array of bindings
 * @returns A new Expression instance
 * @example
 * ```typescript
 * DB.table('users').select(raw('COUNT(*) as total')).get()
 * ```
 */
export function raw(sql: string, bindings: unknown[] = []): Expression {
  return new Expression(sql, bindings)
}

/**
 * Tagged template literal for safe raw SQL construction
 *
 * @param strings - Template strings
 * @param values - Values to be used as bindings
 * @returns A new Expression instance with auto-generated placeholders
 * @example
 * ```typescript
 * const userId = 1;
 * const query = sql`SELECT * FROM users WHERE id = ${userId}`;
 * // Result: Expression { sql: "SELECT * FROM users WHERE id = ?", bindings: [1] }
 * ```
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Expression {
  let sqlString = strings[0] ?? ''
  const bindings: unknown[] = []

  for (let i = 0; i < values.length; i++) {
    sqlString += `?${strings[i + 1] ?? ''}`
    bindings.push(values[i])
  }

  return new Expression(sqlString, bindings)
}
