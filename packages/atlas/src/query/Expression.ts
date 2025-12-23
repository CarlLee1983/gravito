/**
 * Raw SQL Expression
 * @description Represents a raw SQL expression that should not be escaped
 */
export class Expression {
  constructor(
    private readonly sql: string,
    private readonly bindings: unknown[] = []
  ) {}

  /**
   * Get the raw SQL string
   */
  getValue(): string {
    return this.sql
  }

  /**
   * Get the bindings for this expression
   */
  getBindings(): unknown[] {
    return this.bindings
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.sql
  }
}

/**
 * Create a raw SQL expression
 */
export function raw(sql: string, bindings: unknown[] = []): Expression {
  return new Expression(sql, bindings)
}

/**
 * Tagged template literal for safe raw SQL
 * @example sql`SELECT * FROM users WHERE id = ${userId}`
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
