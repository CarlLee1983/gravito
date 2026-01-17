import type { JoinType } from '../../types'

/**
 * Trait for managing SQL JOINS.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanJoin {
  /**
   * Add an INNER JOIN
   */
  join(this: any, table: string, first: string, operator: string, second: string): this {
    return this.addJoin('inner', table, first, operator, second)
  }

  /**
   * Add a LEFT JOIN
   */
  leftJoin(this: any, table: string, first: string, operator: string, second: string): this {
    return this.addJoin('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN
   */
  rightJoin(this: any, table: string, first: string, operator: string, second: string): this {
    return this.addJoin('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN
   */
  crossJoin(this: any, table: string): this {
    this.joins.push({
      type: 'cross',
      table,
      first: '',
      operator: '',
      second: '',
    })
    return this
  }

  /**
   * Add a JOIN clause
   */
  protected addJoin(
    this: any,
    type: JoinType,
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this.joins.push({ type, table, first, operator, second })
    return this
  }
}
