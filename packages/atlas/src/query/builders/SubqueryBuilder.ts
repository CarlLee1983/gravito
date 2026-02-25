import type { QueryBuilderContract } from '../../types'

/**
 * 子查詢操作建構器。
 *
 * 封裝所有子查詢相關方法（whereExists, whereNotExists, whereHas），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export class SubqueryBuilder<T = Record<string, unknown>> {
  constructor(
    private readonly getTableName: () => string,
    private readonly getModelClass: () => any,
    private readonly whereRawFn: (sql: string, bindings: unknown[]) => QueryBuilderContract<T>,
    private readonly whereClauseAddRaw: (sql: string, bindings: unknown[]) => void,
    private readonly createSubQuery: (table?: string) => QueryBuilderContract<any>
  ) {}

  /**
   * 新增 WHERE EXISTS 子查詢條件。
   *
   * @param callback - 定義子查詢邏輯的回呼
   */
  whereExists(callback: (query: QueryBuilderContract<any>) => void): QueryBuilderContract<T> {
    const subQuery = this.createSubQuery()
    callback(subQuery)
    const sql = (subQuery as any).toSql()
    return this.whereRawFn(`EXISTS (${sql})`, (subQuery as any).getBindings())
  }

  /**
   * 新增 WHERE NOT EXISTS 子查詢條件。
   *
   * @param callback - 定義子查詢邏輯的回呼
   */
  whereNotExists(callback: (query: QueryBuilderContract<any>) => void): QueryBuilderContract<T> {
    const subQuery = this.createSubQuery()
    callback(subQuery)
    const sql = (subQuery as any).toSql()
    return this.whereRawFn(`NOT EXISTS (${sql})`, (subQuery as any).getBindings())
  }

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
  ): QueryBuilderContract<T> {
    const modelClass = this.getModelClass()

    if (!modelClass) {
      throw new Error(
        `whereHas() requires a model context. Ensure you are calling it from User.query().`
      )
    }

    const resolver = (this.constructor as any).relationshipResolver
    let relations: Map<string, any>

    if (resolver) {
      relations = resolver.getRelationships(modelClass)
    } else {
      // 備用方案：直接 require（避免循環依賴）
      try {
        const { getRelationships } = require('../../orm/model/relationships')
        relations = getRelationships(modelClass)
      } catch (e: any) {
        throw new Error(
          `whereHas() failed: Relationship resolver not configured and fallback 'require' failed. Error: ${e.message}`
        )
      }
    }

    const meta = relations.get(relation)

    if (!meta) {
      throw new Error(`Relationship '${relation}' not found on model '${modelClass.name}'`)
    }

    const Related = meta.related()
    const relatedTable = Related.getTable ? Related.getTable() : Related.table
    const subQuery = Related.query()

    let foreignKey = meta.foreignKey
    let localKey = meta.localKey

    if (!foreignKey) {
      foreignKey =
        meta.type === 'belongsTo'
          ? `${relatedTable.replace(/s$/, '')}_id`
          : `${this.getTableName().replace(/s$/, '')}_id`
    }
    if (!localKey) {
      localKey = meta.type === 'belongsTo' ? Related.primaryKey : 'id'
    }

    if (meta.type === 'belongsTo') {
      subQuery.whereColumn(`${relatedTable}.${localKey}`, '=', `${this.getTableName()}.${foreignKey}`)
    } else {
      subQuery.whereColumn(`${relatedTable}.${foreignKey}`, '=', `${this.getTableName()}.${localKey}`)
    }

    if (callback) {
      callback(subQuery)
    }

    this.whereClauseAddRaw(`EXISTS (${subQuery.selectRaw('1').toSql()})`, subQuery.getBindings())
    return this as unknown as QueryBuilderContract<T>
  }
}
