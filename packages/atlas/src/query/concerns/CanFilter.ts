import type { BooleanOperator, Operator, QueryBuilderContract } from '../../types'
import { Expression } from '../Expression'
import { QueryBuilder } from '../QueryBuilder'

/**
 * Trait for managing query filtering (WHERE clauses, JSON, Scopes).
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanFilter<T = any> {
  /**
   * Add a WHERE clause
   */
  where(
    this: any,
    column: string | ((query: QueryBuilderContract<T>) => void) | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
    if (typeof column === 'function') {
      return (this as any).whereNested(column, 'and')
    }

    if (typeof column === 'object' && column !== null) {
      for (const [key, val] of Object.entries(column)) {
        this.where(key, '=', val)
      }
      return this
    }

    let operator: Operator
    let finalValue: unknown

    if (value === undefined) {
      operator = '='
      finalValue = operatorOrValue
    } else {
      operator = operatorOrValue as Operator
      finalValue = value
    }

    this.wheres.push({
      type: 'basic',
      column,
      operator,
      value: finalValue,
      boolean: 'and',
    })
    this.bindingsList.push(finalValue)

    return this
  }

  /**
   * Add an OR WHERE clause
   */
  orWhere(
    this: any,
    column: string | ((query: QueryBuilderContract<T>) => void),
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
    if (typeof column === 'function') {
      return (this as any).whereNested(column, 'or')
    }

    let operator: Operator
    let finalValue: unknown

    if (value === undefined) {
      operator = '='
      finalValue = operatorOrValue
    } else {
      operator = operatorOrValue as Operator
      finalValue = value
    }

    this.wheres.push({
      type: 'basic',
      column,
      operator,
      value: finalValue,
      boolean: 'or',
    })
    this.bindingsList.push(finalValue)

    return this
  }

  /**
   * Add a WHERE IN clause
   */
  whereIn(this: any, column: string, values: unknown[]): this {
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'and',
      not: false,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add a WHERE NOT IN clause
   */
  whereNotIn(this: any, column: string, values: unknown[]): this {
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'and',
      not: true,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add an OR WHERE IN clause
   */
  orWhereIn(this: any, column: string, values: unknown[]): this {
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'or',
      not: false,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add an OR WHERE NOT IN clause
   */
  orWhereNotIn(this: any, column: string, values: unknown[]): this {
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'or',
      not: true,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add a WHERE NULL clause
   */
  whereNull(this: any, column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: false,
    })
    return this
  }

  /**
   * Add a WHERE NOT NULL clause
   */
  whereNotNull(this: any, column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: true,
    })
    return this
  }

  /**
   * Add an OR WHERE NULL clause
   */
  orWhereNull(this: any, column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: false,
    })
    return this
  }

  /**
   * Add an OR WHERE NOT NULL clause
   */
  orWhereNotNull(this: any, column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: true,
    })
    return this
  }

  /**
   * Add a WHERE BETWEEN clause
   */
  whereBetween(this: any, column: string, values: [unknown, unknown]): this {
    this.wheres.push({
      type: 'between',
      column,
      values,
      boolean: 'and',
      not: false,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add a WHERE NOT BETWEEN clause
   */
  whereNotBetween(this: any, column: string, values: [unknown, unknown]): this {
    this.wheres.push({
      type: 'between',
      column,
      values,
      boolean: 'and',
      not: true,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add a raw WHERE clause
   */
  whereRaw(this: any, sql: string | Expression, bindings: unknown[] = []): this {
    if (sql instanceof Expression) {
      this.wheres.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'and',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.wheres.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'and',
      })
      this.bindingsList.push(...bindings)
    }
    return this
  }

  /**
   * Add a raw OR WHERE clause
   */
  orWhereRaw(this: any, sql: string | Expression, bindings: unknown[] = []): this {
    if (sql instanceof Expression) {
      this.wheres.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'or',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.wheres.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'or',
      })
      this.bindingsList.push(...bindings)
    }
    return this
  }

  /**
   * Add a WHERE column comparison clause
   */
  whereColumn(this: any, first: string, operator: Operator, second: string): this {
    this.wheres.push({
      type: 'column',
      operator,
      values: [first, second],
      boolean: 'and',
    })
    return this
  }

  /**
   * Add a WHERE JSON clause
   */
  whereJson(this: any, column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Add an OR WHERE JSON clause
   */
  orWhereJson(this: any, column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Add a WHERE JSON CONTAINS clause
   */
  whereJsonContains(this: any, column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

  /**
   * Add an OR WHERE JSON CONTAINS clause
   */
  orWhereJsonContains(this: any, column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

  /**
   * Add a nested WHERE clause
   */
  protected whereNested(
    this: any,
    callback: (query: QueryBuilderContract<T>) => void,
    boolean: BooleanOperator
  ): this {
    const nestedQuery = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)
    callback(nestedQuery)

    if (nestedQuery.wheres.length > 0) {
      const compiled = (nestedQuery as any).getCompiledQuery()
      const nestedSql = this.grammar
        .compileSelect(compiled)
        .replace(/^SELECT \* FROM .+ WHERE /, '')

      this.wheres.push({
        type: 'nested',
        sql: nestedSql,
        bindings: (nestedQuery as any).bindingsList,
        boolean,
      })
      this.bindingsList.push(...(nestedQuery as any).bindingsList)
    }

    return this
  }

  /**
   * Add a WHERE HAS relationship existence clause
   */
  whereHas(
    this: any,
    relation: string,
    callback?: (query: QueryBuilderContract<any>) => void
  ): this {
    if (!this.modelClass) {
      throw new Error(
        `whereHas() requires a model context. Ensure you are calling it from User.query().`
      )
    }

    const { getRelationships } = require('../../orm/model/relationships')
    const relations = getRelationships(this.modelClass)
    const meta = relations.get(relation)

    if (!meta) {
      throw new Error(`Relationship '${relation}' not found on model '${this.modelClass.name}'`)
    }

    const Related = meta.related()
    const relatedTable = Related.getTable ? Related.getTable() : Related.table
    const subQuery = Related.query()

    // Resolve keys
    let foreignKey = meta.foreignKey
    let localKey = meta.localKey

    if (!foreignKey) {
      foreignKey =
        meta.type === 'belongsTo'
          ? `${relatedTable.replace(/s$/, '')}_id`
          : `${this.tableName.replace(/s$/, '')}_id`
    }
    if (!localKey) {
      localKey = meta.type === 'belongsTo' ? Related.primaryKey : 'id'
    }

    // Link subquery to parent: EXISTS (SELECT 1 FROM related WHERE related.fk = parent.pk)
    if (meta.type === 'belongsTo') {
      // For BelongsTo, the FK is on OUR table
      subQuery.whereColumn(`${relatedTable}.${localKey}`, '=', `${this.tableName}.${foreignKey}`)
    } else {
      // For HasMany/HasOne, the FK is on THEIR table
      subQuery.whereColumn(`${relatedTable}.${foreignKey}`, '=', `${this.tableName}.${localKey}`)
    }

    if (callback) {
      callback(subQuery)
    }

    return this.whereRaw(`EXISTS (${subQuery.selectRaw('1').toSql()})`, subQuery.getBindings())
  }

  /**
   * Apply a global scope to the query
   */
  applyScope(this: any, name: string, callback: (query: QueryBuilderContract<T>) => void): this {
    this.globalScopes.set(name, callback)
    return this
  }

  /**
   * Remove a global scope from the query
   */
  withoutGlobalScope(this: any, name: string): this {
    this.removedScopes.add(name)
    return this
  }

  /**
   * Apply all registered global scopes
   */
  protected applyGlobalScopes(this: any): void {
    if (this._isApplyingScopes) return

    this._isApplyingScopes = true

    for (const [name, callback] of this.globalScopes) {
      if (!this.removedScopes.has(name)) {
        callback(this as unknown as QueryBuilderContract<T>)
      }
    }

    this._isApplyingScopes = false
  }
}
