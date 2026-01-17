import type { Operator } from '../../types'
import { Expression } from '../Expression'

/**
 * Trait for managing SQL GROUP BY and HAVING.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanGroup {
  /**
   * Add GROUP BY columns
   */
  groupBy(this: any, ...columns: string[]): this {
    this.groups.push(...columns)
    return this
  }

  /**
   * Add a HAVING clause
   */
  having(this: any, column: string, operator: Operator, value: unknown): this {
    this.havings.push({
      type: 'basic',
      column,
      operator,
      value,
      boolean: 'and',
    })
    this.bindingsList.push(value)
    return this
  }

  /**
   * Add a raw HAVING clause
   */
  havingRaw(this: any, sql: string | Expression, bindings: unknown[] = []): this {
    if (sql instanceof Expression) {
      this.havings.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'and',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.havings.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'and',
      })
      this.bindingsList.push(...bindings)
    }
    return this
  }
}
