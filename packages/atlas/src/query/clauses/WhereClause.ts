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
export class WhereClause {
  /** Internal storage for WHERE conditions */
  private wheres: WhereCondition[] = []

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
  add(column: string, operator: Operator, value: unknown, boolean: 'and' | 'or' = 'and'): void {
    this.wheres.push({
      type: 'basic',
      column,
      operator,
      value,
      boolean,
    })
  }

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
  addNested(conditions: WhereCondition[], boolean: 'and' | 'or' = 'and'): void {
    this.wheres.push({
      type: 'nested',
      conditions,
      boolean,
    })
  }

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
  addIn(column: string, values: unknown[], boolean: 'and' | 'or' = 'and', not = false): void {
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean,
      not,
    })
  }

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
  addNull(column: string, boolean: 'and' | 'or' = 'and', not = false): void {
    this.wheres.push({
      type: 'null',
      column,
      boolean,
      not,
    })
  }

  /**
   * Add a WHERE NOT NULL condition
   *
   * @param column - Column name
   * @param boolean - Logical connector
   */
  addNotNull(column: string, boolean: 'and' | 'or' = 'and'): void {
    this.addNull(column, boolean, true)
  }

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
    boolean: 'and' | 'or' = 'and',
    not = false
  ): void {
    this.wheres.push({
      type: 'between',
      column,
      values,
      boolean,
      not,
    })
  }

  /**
   * Add a raw WHERE condition
   *
   * @param sql - SQL string
   * @param bindings - Bindings array
   * @param boolean - Logical connector
   */
  addRaw(sql: string, bindings: unknown[], boolean: 'and' | 'or' = 'and'): void {
    this.wheres.push({
      type: 'raw',
      sql,
      bindings,
      boolean,
    })
  }

  /**
   * Add a column comparison condition
   *
   * @param first - First column
   * @param operator - Operator
   * @param second - Second column
   * @param boolean - Logical connector
   */
  addColumn(
    first: string,
    operator: Operator,
    second: string,
    boolean: 'and' | 'or' = 'and'
  ): void {
    this.wheres.push({
      type: 'column',
      column: first,
      operator,
      value: second,
      boolean,
    })
  }

  /**
   * Get all registered WHERE conditions
   *
   * @returns Array of conditions
   */
  getWheres(): WhereCondition[] {
    return this.deepCopyConditions(this.wheres)
  }

  /**
   * Helper to perform deep copy of conditions
   */
  private deepCopyConditions(conditions: WhereCondition[]): WhereCondition[] {
    return conditions.map((w) => {
      const copy = { ...w }
      if (w.conditions) {
        copy.conditions = this.deepCopyConditions(w.conditions)
      }
      if (w.values) {
        copy.values = [...w.values]
      }
      if (w.bindings) {
        copy.bindings = [...w.bindings]
      }
      return copy
    })
  }

  /**
   * Extract all values from the conditions for use as query bindings
   *
   * @returns Array of binding values
   */
  getValues(): unknown[] {
    const values: unknown[] = []

    for (const where of this.wheres) {
      if (where.type === 'basic') {
        if (where.value instanceof Object && 'getCompiledQuery' in where.value) {
          // SubQuery as value
          values.push(...(where.value as any).getBindings())
        } else {
          values.push(where.value)
        }
      } else if (where.type === 'in' || where.type === 'between') {
        for (const val of where.values || []) {
          if (val instanceof Object && 'getCompiledQuery' in val) {
            values.push(...(val as any).getBindings())
          } else {
            values.push(val)
          }
        }
      } else if (where.type === 'raw' || where.type === 'exists') {
        values.push(...(where.bindings || []))
      } else if (where.type === 'nested') {
        values.push(...this.getNestedValues(where.conditions || []))
      }
    }

    return values
  }

  private getNestedValues(conditions: WhereCondition[]): unknown[] {
    const values: unknown[] = []
    for (const where of conditions) {
      if (where.type === 'basic') {
        if (where.value instanceof Object && 'getCompiledQuery' in where.value) {
          // SubQuery as value
          values.push(...(where.value as any).getBindings())
        } else {
          values.push(where.value)
        }
      } else if (where.type === 'in' || where.type === 'between') {
        for (const val of where.values || []) {
          if (val instanceof Object && 'getCompiledQuery' in val) {
            values.push(...(val as any).getBindings())
          } else {
            values.push(val)
          }
        }
      } else if (where.type === 'raw' || where.type === 'exists') {
        values.push(...(where.bindings || []))
      } else if (where.type === 'nested') {
        values.push(...this.getNestedValues(where.conditions || []))
      }
    }
    return values
  }

  /**
   * Compile the WHERE clause to SQL
   *
   * @returns SQL string for the clause
   */
  toSQL(): string {
    if (this.wheres.length === 0) {
      return ''
    }

    const parts: string[] = []

    for (let i = 0; i < this.wheres.length; i++) {
      const where = this.wheres[i]
      let sql = ''

      if (i > 0) {
        sql += ` ${where.boolean?.toUpperCase() || 'AND'} `
      }

      if (where.type === 'basic') {
        sql += `"${where.column}" ${where.operator || '='} ?`
      } else if (where.type === 'nested') {
        sql += `(${this.compileNested(where.conditions || [])})`
      } else if (where.type === 'in') {
        const placeholders = where.values?.map(() => '?').join(', ') || ''
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" ${not}IN (${placeholders})`
      } else if (where.type === 'null') {
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" IS ${not}NULL`
      } else if (where.type === 'between') {
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" ${not}BETWEEN ? AND ?`
      } else if (where.type === 'raw') {
        sql += where.sql
      } else if (where.type === 'column') {
        sql += `"${where.column}" ${where.operator} "${where.value}"`
      }

      parts.push(sql)
    }

    return `WHERE ${parts.join('')}`
  }

  /**
   * Recursively compile nested conditions to SQL
   *
   * @param conditions - Array of nested conditions
   * @returns Compiled SQL string for the nested group
   * @internal
   */
  private compileNested(conditions: WhereCondition[]): string {
    const parts: string[] = []

    for (let i = 0; i < conditions.length; i++) {
      const where = conditions[i]
      let sql = ''

      if (i > 0) {
        sql += ` ${where.boolean?.toUpperCase() || 'AND'} `
      }

      if (where.type === 'basic') {
        sql += `"${where.column}" ${where.operator || '='} ?`
      } else if (where.type === 'in') {
        const placeholders = where.values?.map(() => '?').join(', ') || ''
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" ${not}IN (${placeholders})`
      } else if (where.type === 'null') {
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" IS ${not}NULL`
      } else if (where.type === 'nested') {
        sql += `(${this.compileNested(where.conditions || [])})`
      } else if (where.type === 'between') {
        const not = where.not ? 'NOT ' : ''
        sql += `"${where.column}" ${not}BETWEEN ? AND ?`
      } else if (where.type === 'raw') {
        sql += where.sql
      } else if (where.type === 'column') {
        sql += `"${where.column}" ${where.operator} "${where.value}"`
      }

      parts.push(sql)
    }

    return parts.join('')
  }

  /**
   * Reset the clause state
   */
  reset(): void {
    this.wheres = []
  }

  /**
   * Check if the clause has any conditions registered
   *
   * @returns True if conditions exist
   */
  hasConditions(): boolean {
    return this.wheres.length > 0
  }

  /**
   * Clone the clause
   *
   * @returns A deep copy of the clause
   */
  clone(): WhereClause {
    const clone = new WhereClause()
    // We need a deep copy if we modify the condition objects, but we generally don't.
    // However, nested arrays should be copied.
    clone.wheres = this.wheres.map((w) => {
      if (w.type === 'nested' && w.conditions) {
        return { ...w, conditions: [...w.conditions] }
      }
      return { ...w }
    })
    return clone
  }
}
