import type { ConnectionContract, GrammarContract } from '../../types'
import { Expression } from '../Expression'
import { QueryBuilderError } from '../QueryBuilder'

/**
 * 寫入操作建構器。
 *
 * 封裝所有資料庫寫入方法（insert, update, delete, upsert, truncate
 * 以及 increment/decrement 原子操作），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export class MutationBuilder<T = Record<string, unknown>> {
  constructor(
    private readonly connection: ConnectionContract,
    private readonly grammar: GrammarContract,
    private readonly getTableName: () => string,
    private readonly getCompiledQuery: () => import('../../types').CompiledQuery,
    private readonly getBindings: () => unknown[],
    private readonly updateFn: (data: Partial<T>) => Promise<number>
  ) {}

  /**
   * 將資料插入資料表。
   *
   * 自動處理批次分割（chunking）以保持在綁定參數限制內。
   *
   * @param data - 單一物件或物件陣列
   * @returns 已插入的物件陣列（若驅動支援則含生成的 ID）
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Insert', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'insert',
      'db.sql.table': this.getTableName(),
    })

    try {
      const values = Array.isArray(data) ? data : [data]
      if (values.length === 0) {
        return []
      }

      const chunkSize = this.calculateOptimalChunkSize(values)
      const results: T[] = []

      if (values.length > chunkSize) {
        return await this.connection.transaction(async (trx) => {
          for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize)
            const chunkResult = await trx.table<T>(this.getTableName()).insert(chunk)
            results.push(...chunkResult)
          }
          return results
        })
      }

      const allBindings: unknown[] = []
      for (const row of values) {
        allBindings.push(...Object.values(row as Record<string, unknown>))
      }

      const sql = this.grammar.compileInsert(
        this.getCompiledQuery(),
        values as Record<string, unknown>[]
      )

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<T>(sql, allBindings)
      const rows = result.rows as T[]
      // biome-ignore lint/suspicious/noExplicitAny: 附加中繼資料到陣列
      ;(rows as any)._queryResult = result
      return rows
    } finally {
      span?.end()
    }
  }

  /**
   * 插入資料並回傳主鍵值。
   *
   * @param data - 記錄資料
   * @param primaryKey - 自動遞增欄位名稱
   * @returns 生成的 ID
   * @throws {QueryBuilderError} 若 ID 取得失敗
   */
  async insertGetId(data: Partial<T>, primaryKey = 'id'): Promise<number | bigint> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:InsertGetId', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'insert',
      'db.sql.table': this.getTableName(),
    })

    try {
      const values = Object.values(data as Record<string, unknown>)
      const sql = this.grammar.compileInsertGetId(
        this.getCompiledQuery(),
        data as Record<string, unknown>,
        primaryKey
      )

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<Record<string, number | bigint>>(sql, values)
      const id = result.rows[0]?.[primaryKey]
      if (id === undefined) {
        throw new QueryBuilderError('Failed to get insert ID')
      }
      return id
    } finally {
      span?.end()
    }
  }

  /**
   * 更新符合當前查詢條件的記錄。
   *
   * @param data - 更新值
   * @returns 受影響的行數
   */
  async update(data: Partial<T>): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Update', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'update',
      'db.sql.table': this.getTableName(),
    })

    try {
      const values: unknown[] = []
      for (const value of Object.values(data as Record<string, unknown>)) {
        if (value instanceof Expression) {
          values.push(...value.getBindings())
        } else {
          values.push(value)
        }
      }

      const allBindings = [...values, ...this.getBindings()]

      const compiled = this.getCompiledQuery()
      const updatedCompiled = { ...compiled, bindings: allBindings }

      const sql = this.grammar.compileUpdate(updatedCompiled, data as Record<string, unknown>)

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, allBindings)
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * 更新 JSON 欄位的特殊方法。
   *
   * @param column - 目標 JSON 欄位名稱
   * @param value - 新的 JSON 值
   */
  async updateJson(column: string, value: unknown): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:UpdateJson', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'update',
      'db.sql.table': this.getTableName(),
    })

    try {
      const sql = this.grammar.compileUpdateJson(this.getCompiledQuery(), column, value)

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, [value, ...this.getBindings()])
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * 刪除符合查詢條件的記錄。
   *
   * 注意：此為硬刪除。軟刪除請使用 Model 層。
   */
  async delete(): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Delete', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'delete',
      'db.sql.table': this.getTableName(),
    })

    try {
      const sql = this.grammar.compileDelete(this.getCompiledQuery())

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, this.getBindings())
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * 清空所有記錄並重設自動遞增狀態。
   */
  async truncate(): Promise<void> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Truncate', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'truncate',
      'db.sql.table': this.getTableName(),
    })

    try {
      const sql = this.grammar.compileTruncate(this.getCompiledQuery())

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      await this.connection.getDriver().execute(sql)
    } finally {
      span?.end()
    }
  }

  /**
   * 原子性地遞增數值欄位。
   *
   * @param column - 目標欄位名稱
   * @param amount - 遞增量（預設 1）
   * @param extra - 同時更新的其他欄位
   */
  async increment(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} + ${amount}`),
    } as Partial<T>
    return this.updateFn(data)
  }

  /**
   * 原子性地遞減數值欄位。
   *
   * @param column - 目標欄位名稱
   * @param amount - 遞減量（預設 1）
   * @param extra - 同時更新的其他欄位
   */
  async decrement(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} - ${amount}`),
    } as Partial<T>
    return this.updateFn(data)
  }

  /**
   * 插入記錄，若唯一性衝突則更新。
   *
   * @param data - 要處理的記錄
   * @param uniqueBy - 識別唯一性的欄位
   * @param update - 衝突時要更新的欄位（省略則更新所有非唯一欄位）
   * @returns 受影響的行數
   */
  async upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number> {
    const values = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[]
    if (values.length === 0) {
      return 0
    }

    const uniqueByArray = Array.isArray(uniqueBy) ? uniqueBy : [uniqueBy]
    const updateArray = update || Object.keys(values[0]).filter((k) => !uniqueByArray.includes(k))

    const allBindings: unknown[] = []
    for (const row of values) {
      allBindings.push(...Object.values(row))
    }

    const sql = this.grammar.compileUpsert(
      this.getCompiledQuery(),
      values,
      uniqueByArray,
      updateArray
    )
    const result = await this.connection.getDriver().execute(sql, allBindings)

    return result.affectedRows
  }

  /**
   * 最佳化批次大小以避免超出驅動的綁定參數限制。
   * @internal
   */
  private calculateOptimalChunkSize(values: Partial<T>[]): number {
    const MAX_BINDINGS = 65000
    const columnsCount = Object.keys(values[0] || {}).length || 1

    const safeChunkSize = Math.floor(MAX_BINDINGS / columnsCount)

    return Math.min(safeChunkSize, 1000)
  }
}
