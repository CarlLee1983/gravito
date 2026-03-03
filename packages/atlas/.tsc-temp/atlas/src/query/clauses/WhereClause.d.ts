import type { Operator } from '../../types'
/**
 * Where Condition Interface
 * @description Represents a single WHERE condition or a group of nested conditions
 */
export interface WhereCondition {
  /** Type of the condition */
  type: 'basic' | 'nested' | 'in' | 'null' | 'between' | 'raw' | 'exists' | 'column'
  /** Column name for the condition */
  column?: string
  /** Comparison operator (e.g., '=', '!=', 'LIKE') */
  operator?: Operator
  /** Value to compare against (for basic conditions) */
  value?: unknown
  /** Logical connector to the previous condition ('and' or 'or') */
  boolean: 'and' | 'or'
  /** Array of nested conditions (for 'nested' type) */
  conditions?: WhereCondition[]
  /** Array of values (for 'in' type) */
  values?: unknown[]
  /** Whether to negate the condition (e.g., NOT IN, IS NOT NULL) */
  not?: boolean
  /** Raw SQL for raw clauses */
  sql?: string
  /** Bindings for raw clauses */
  bindings?: unknown[]
}
/**
 * Where Clause
 * @description Handles the construction of WHERE clauses with support for complex nested conditions
 */
export declare class WhereClause {
  /** Internal storage for WHERE conditions */
  private wheres
  /**
   * Add a basic WHERE condition
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare
   * @param boolean - Logical connector ('and' or 'or')
   * @example
   * ```typescript
   * clause.add('status', '=', 'active')
   * ```
   */
  add(column: string, operator: Operator, value: unknown, boolean?: 'and' | 'or'): void
  /**
   * Add a group of nested WHERE conditions
   *
   * @param conditions - Array of nested conditions
   * @param boolean - Logical connector for the group
   * @example
   * ```typescript
   * clause.addNested([
   *   { type: 'basic', column: 'age', operator: '>', value: 18 },
   *   { type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'or' }
   * ])
   * ```
   */
  addNested(conditions: WhereCondition[], boolean?: 'and' | 'or'): void
  /**
   * Add a WHERE IN condition
   *
   * @param column - Column name
   * @param values - Array of values to check against
   * @param boolean - Logical connector
   * @param not - Whether to use NOT IN
   * @example
   * ```typescript
   * clause.addIn('id', [1, 2, 3])
   * ```
   */
  addIn(column: string, values: unknown[], boolean?: 'and' | 'or', not?: boolean): void
  /**
   * Add a WHERE NULL condition
   *
   * @param column - Column name
   * @param boolean - Logical connector
   * @param not - Whether to use IS NOT NULL
   * @example
   * ```typescript
   * clause.addNull('deleted_at')
   * ```
   */
  addNull(column: string, boolean?: 'and' | 'or', not?: boolean): void
  /**
   * Add a WHERE NOT NULL condition
   *
   * @param column - Column name
   * @param boolean - Logical connector
   */
  addNotNull(column: string, boolean?: 'and' | 'or'): void
  /**
   * Add a WHERE BETWEEN condition
   *
   * @param column - Column name
   * @param values - [min, max] values
   * @param boolean - Logical connector
   * @param not - Negate condition
   */
  addBetween(
    column: string,
    values: [unknown, unknown],
    boolean?: 'and' | 'or',
    not?: boolean
  ): void
  /**
   * Add a raw WHERE condition
   *
   * @param sql - SQL string
   * @param bindings - Bindings array
   * @param boolean - Logical connector
   */
  addRaw(sql: string, bindings: unknown[], boolean?: 'and' | 'or'): void
  /**
   * Add a column comparison condition
   *
   * @param first - First column
   * @param operator - Operator
   * @param second - Second column
   * @param boolean - Logical connector
   */
  addColumn(first: string, operator: Operator, second: string, boolean?: 'and' | 'or'): void
  /**
   * Get all registered WHERE conditions
   *
   * @returns Array of conditions
   */
  getWheres(): WhereCondition[]
  /**
   * Helper to perform deep copy of conditions
   */
  private deepCopyConditions
  /**
   * Extract all values from the conditions for use as query bindings
   *
   * @returns Array of binding values
   */
  getValues(): unknown[]
  private getNestedValues
  /**
   * Compile the WHERE clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string
  /**
   * Recursively compile nested conditions to SQL
   *
   * @param conditions - Array of nested conditions
   * @returns Compiled SQL string for the nested group
   * @internal
   */
  private compileNested
  /**
   * Reset the clause state
   */
  reset(): void
  /**
   * Check if the clause has any conditions registered
   *
   * @returns True if conditions exist
   */
  hasConditions(): boolean
  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): WhereClause
}
