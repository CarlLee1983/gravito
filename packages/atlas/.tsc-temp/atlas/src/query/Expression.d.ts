/**
 * Raw SQL Expression
 * @description Represents a raw SQL expression that should not be escaped by the query builder.
 * Use this for complex SQL fragments, function calls, or database-specific syntax.
 */
export declare class Expression {
  private readonly sql
  private readonly bindings
  /**
   * Create a new Expression instance
   *
   * @param sql - The raw SQL string
   * @param bindings - Optional array of bindings for the expression
   */
  constructor(sql: string, bindings?: unknown[])
  /**
   * Get the raw SQL string
   *
   * @returns The SQL string
   */
  getValue(): string
  /**
   * Get the bindings associated with this expression
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[]
  /**
   * Convert the expression to its SQL string representation
   *
   * @returns The SQL string
   */
  toString(): string
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
export declare function raw(sql: string, bindings?: unknown[]): Expression
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
export declare function sql(strings: TemplateStringsArray, ...values: unknown[]): Expression
