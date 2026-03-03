import type { ConnectionContract, GrammarContract } from '../../types'
/**
 * 聚合操作建構器。
 *
 * 封裝所有統計彙總方法（count, sum, avg, min, max），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 */
export declare class AggregateBuilder {
  private readonly connection
  private readonly grammar
  private readonly getTableName
  private readonly getCompiledQuery
  constructor(
    connection: ConnectionContract,
    grammar: GrammarContract,
    getTableName: () => string,
    getCompiledQuery: () => import('../../types').CompiledQuery
  )
  /**
   * 回傳符合條件的記錄筆數。
   *
   * @param column - 計算欄位（預設 '*'）
   */
  count(column?: string): Promise<number>
  /**
   * 回傳欄位最大值。
   */
  max<V = number>(column: string): Promise<V | null>
  /**
   * 回傳欄位最小值。
   */
  min<V = number>(column: string): Promise<V | null>
  /**
   * 回傳欄位平均值。
   */
  avg(column: string): Promise<number | null>
  /**
   * 回傳欄位總和。
   */
  sum(column: string): Promise<number>
  /**
   * 執行指定聚合函數的內部方法。
   *
   * @param func - 聚合函數名稱（count/sum/avg/min/max）
   * @param column - 目標欄位
   * @internal
   */
  runAggregate(func: string, column: string): Promise<number | null>
}
