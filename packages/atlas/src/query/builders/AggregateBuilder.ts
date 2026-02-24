import type { ConnectionContract, GrammarContract } from '../../types'

/**
 * 聚合操作建構器。
 *
 * 封裝所有統計彙總方法（count, sum, avg, min, max），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 */
export class AggregateBuilder {
  constructor(
    private readonly connection: ConnectionContract,
    private readonly grammar: GrammarContract,
    private readonly getTableName: () => string,
    private readonly getCompiledQuery: () => import('../../types').CompiledQuery
  ) {}

  /**
   * 回傳符合條件的記錄筆數。
   *
   * @param column - 計算欄位（預設 '*'）
   */
  async count(column = '*'): Promise<number> {
    const result = await this.runAggregate('count', column)
    return result ?? 0
  }

  /**
   * 回傳欄位最大值。
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.runAggregate('max', column) as Promise<V | null>
  }

  /**
   * 回傳欄位最小值。
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.runAggregate('min', column) as Promise<V | null>
  }

  /**
   * 回傳欄位平均值。
   */
  async avg(column: string): Promise<number | null> {
    return this.runAggregate('avg', column)
  }

  /**
   * 回傳欄位總和。
   */
  async sum(column: string): Promise<number> {
    return (await this.runAggregate('sum', column)) ?? 0
  }

  /**
   * 執行指定聚合函數的內部方法。
   *
   * @param func - 聚合函數名稱（count/sum/avg/min/max）
   * @param column - 目標欄位
   * @internal
   */
  async runAggregate(func: string, column: string): Promise<number | null> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan(`Atlas:Aggregate ${func}`, {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'select',
      'db.sql.table': this.getTableName(),
    })

    try {
      const compiled = this.getCompiledQuery()
      const sql = this.grammar.compileAggregate(compiled, { function: func, column })

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<{ aggregate: number | null }>(sql, compiled.bindings)
      const value = result.rows[0]?.aggregate
      return value === null || value === undefined ? null : Number(value)
    } finally {
      span?.end()
    }
  }
}
