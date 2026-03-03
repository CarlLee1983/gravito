import type { QueryBuilderContract } from '../../types'
/**
 * 子查詢操作建構器。
 *
 * 封裝所有子查詢相關方法（whereExists, whereNotExists, whereHas），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export declare class SubqueryBuilder<T = Record<string, unknown>> {
  private readonly getTableName
  private readonly getModelClass
  private readonly whereRawFn
  private readonly whereClauseAddRaw
  private readonly createSubQuery
  constructor(
    getTableName: () => string,
    getModelClass: () => any,
    whereRawFn: (sql: string, bindings: unknown[]) => QueryBuilderContract<T>,
    whereClauseAddRaw: (sql: string, bindings: unknown[]) => void,
    createSubQuery: (table?: string) => QueryBuilderContract<any>
  )
  /**
   * 新增 WHERE EXISTS 子查詢條件。
   *
   * @param callback - 定義子查詢邏輯的回呼
   */
  whereExists(callback: (query: QueryBuilderContract<any>) => void): QueryBuilderContract<T>
  /**
   * 新增 WHERE NOT EXISTS 子查詢條件。
   *
   * @param callback - 定義子查詢邏輯的回呼
   */
  whereNotExists(callback: (query: QueryBuilderContract<any>) => void): QueryBuilderContract<T>
  /**
   * 依關聯存在性篩選查詢。
   *
   * 需要在有 Model 上下文的 QueryBuilder 中呼叫。
   *
   * @param relation - 關聯名稱
   * @param callback - 額外條件回呼（可選）
   */
  whereHas(
    relation: string,
    callback?: (query: QueryBuilderContract<unknown>) => void
  ): QueryBuilderContract<T>
}
