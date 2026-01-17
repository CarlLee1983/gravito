/**
 * Where Clause
 *
 * Handles WHERE conditions with support for AND/OR logic
 */

import type { Operator } from '../../types'

export interface WhereCondition {
  type: 'basic' | 'nested' | 'in' | 'null' | 'not_null'
  column?: string
  operator?: Operator
  value?: unknown
  boolean?: 'and' | 'or'
  conditions?: WhereCondition[]
  values?: unknown[]
  not?: boolean
}

export class WhereClause {
  private wheres: WhereCondition[] = []

  /**
   * Add a basic WHERE condition
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare
   * @param boolean - AND or OR
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
   * Add a nested WHERE condition (callback)
   *
   * @param conditions - Nested conditions
   * @param boolean - AND or OR
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
   * @param values - Array of values
   * @param boolean - AND or OR
   * @param not - True for NOT IN
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
   * @param boolean - AND or OR
   * @param not - True for NOT NULL
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
   * @param boolean - AND or OR
   */
  addNotNull(column: string, boolean: 'and' | 'or' = 'and'): void {
    this.addNull(column, boolean, true)
  }

  /**
   * Get all WHERE conditions
   *
   * @returns Array of WHERE conditions
   */
  getWheres(): WhereCondition[] {
    return this.wheres
  }

  /**
   * Get values from conditions (for bindings)
   *
   * @returns Array of values
   */
  getValues(): unknown[] {
    const values: unknown[] = []

    for (const where of this.wheres) {
      if (where.type === 'basic') {
        values.push(where.value)
      } else if (where.type === 'in') {
        values.push(...(where.values || []))
      }
    }

    return values
  }

  /**
   * Compile to SQL
   *
   * @returns WHERE clause SQL
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
      }

      parts.push(sql)
    }

    return `WHERE ${parts.join('')}`
  }

  /**
   * Compile nested conditions
   *
   * @param conditions - Nested conditions
   * @returns Compiled SQL
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
      }

      parts.push(sql)
    }

    return parts.join('')
  }

  /**
   * Reset clause state
   */
  reset(): void {
    this.wheres = []
  }

  /**
   * Check if clause has conditions
   */
  hasConditions(): boolean {
    return this.wheres.length > 0
  }
}
