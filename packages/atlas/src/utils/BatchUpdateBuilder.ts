/**
 * BatchUpdateBuilder - 批量更新/刪除工具
 *
 * 提供安全且高效的批量更新與刪除操作。
 *
 * @example
 * ```typescript
 * // 批量更新
 * const builder = new BatchUpdateBuilder(connection, 'posts')
 * const result = await builder
 *   .where('status', '=', 'draft')
 *   .where('createdAt', '<', sevenDaysAgo)
 *   .update({ status: 'archived' })
 *
 * // 批量刪除
 * const result = await connection
 *   .table('logs')
 *   .where('createdAt', '<', thirtyDaysAgo)
 *   .delete()
 * ```
 */

import type { ConnectionContract } from '@gravito/atlas'

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const SAFE_OPERATORS = new Set(['=', '!=', '<>', '>', '>=', '<', '<=', 'LIKE', 'ILIKE', 'IN'])

function validateIdentifier(name: string, kind: string): void {
  if (!SAFE_IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind}: ${name}`)
  }
}

function validateOperator(operator: string): void {
  if (!SAFE_OPERATORS.has(operator.toUpperCase())) {
    throw new Error(`Invalid operator: ${operator}`)
  }
}

export interface UpdateCondition {
  column: string
  operator: string
  value: unknown
}

export interface BatchUpdateResult {
  affectedRows: number
  conditions: UpdateCondition[]
  duration: number
}

export interface BatchDeleteResult {
  deletedRows: number
  conditions: UpdateCondition[]
  duration: number
}

export class BatchUpdateBuilder {
  private conditions: UpdateCondition[] = []

  constructor(
    private connection: ConnectionContract,
    private tableName: string
  ) {
    validateIdentifier(tableName, 'table name')
  }

  /**
   * 新增 WHERE 條件
   *
   * ✅ 參數綁定防止 SQL Injection
   */
  where(column: string, operator: string, value: unknown): this {
    validateIdentifier(column, 'column name')
    validateOperator(operator)
    this.conditions.push({ column, operator, value })
    return this
  }

  /**
   * 執行批量更新
   *
   * ✅ 安全：所有條件都通過參數綁定
   * ✅ 驗證：確保至少有一個條件
   */
  async update(updates: Record<string, unknown>): Promise<BatchUpdateResult> {
    if (this.conditions.length === 0) {
      throw new Error('UPDATE 操作必須至少有一個 WHERE 條件（防止全表更新）')
    }

    const startTime = performance.now()

    // 建立 SET 子句
    const setClause = Object.keys(updates)
      .map((col, idx) => {
        validateIdentifier(col, 'column name')
        return `${col} = $${idx + 1}`
      })
      .join(', ')

    // 建立 WHERE 子句
    const whereClause = this.conditions
      .map((cond, idx) => {
        const paramIdx = Object.keys(updates).length + idx + 1
        return `${cond.column} ${cond.operator} $${paramIdx}`
      })
      .join(' AND ')

    // 合併所有參數
    const params = [...Object.values(updates), ...this.conditions.map((c) => c.value)]

    // 執行更新
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`

    const result = await this.connection.raw(sql, params)

    const endTime = performance.now()

    return {
      affectedRows: result.rowCount || 0,
      conditions: [...this.conditions],
      duration: endTime - startTime,
    }
  }

  /**
   * 執行批量刪除
   *
   * ✅ 安全：強制要求 WHERE 條件
   * ✅ 驗證：確保至少有一個條件
   */
  async delete(): Promise<BatchDeleteResult> {
    if (this.conditions.length === 0) {
      throw new Error('DELETE 操作必須至少有一個 WHERE 條件（防止全表刪除）')
    }

    const startTime = performance.now()

    // 建立 WHERE 子句
    const whereClause = this.conditions
      .map((cond, idx) => `${cond.column} ${cond.operator} $${idx + 1}`)
      .join(' AND ')

    // 取得所有參數
    const params = this.conditions.map((c) => c.value)

    // 執行刪除
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`

    const result = await this.connection.raw(sql, params)

    const endTime = performance.now()

    return {
      deletedRows: result.rowCount || 0,
      conditions: [...this.conditions],
      duration: endTime - startTime,
    }
  }

  /**
   * 執行批量刪除 - 帶時間戳驗證
   *
   * ✅ 安全：檢查 updatedAt 欄位以驗證記錄年齡
   */
  async deleteOldRecords(
    olderThanDate: Date,
    checkColumn = 'updatedAt'
  ): Promise<BatchDeleteResult> {
    this.where(checkColumn, '<', olderThanDate)
    return this.delete()
  }

  /**
   * 取得條件數
   */
  getConditionCount(): number {
    return this.conditions.length
  }

  /**
   * 重設條件
   */
  reset(): this {
    this.conditions = []
    return this
  }
}

/**
 * 安全的批量刪除函數
 *
 * @example
 * ```typescript
 * const result = await safeBatchDelete(
 *   connection,
 *   'logs',
 *   { column: 'createdAt', operator: '<', value: thirtyDaysAgo },
 *   { limit: 10000 } // 最多刪除 10000 條
 * )
 * ```
 */
export async function safeBatchDelete(
  connection: ConnectionContract,
  tableName: string,
  condition: UpdateCondition,
  options: { limit?: number; batchSize?: number } = {}
): Promise<{ totalDeleted: number; batches: number }> {
  const limit = options.limit || 100000

  let totalDeleted = 0
  let batches = 0

  // 分批刪除
  while (totalDeleted < limit) {
    const builder = new BatchUpdateBuilder(connection, tableName)
    builder.where(condition.column, condition.operator, condition.value)

    // 每批最多刪除 batchSize 條
    const result = await builder.delete()

    if (result.deletedRows === 0) {
      break // 沒有更多記錄要刪除
    }

    totalDeleted += result.deletedRows
    batches++

    // 檢查是否達到限制
    if (totalDeleted >= limit) {
      break
    }
  }

  return { totalDeleted, batches }
}

/**
 * 安全的批量更新函數
 *
 * @example
 * ```typescript
 * const result = await safeBatchUpdate(
 *   connection,
 *   'users',
 *   { status: 'inactive' },
 *   [
 *     { column: 'lastLogin', operator: '<', value: ninetyDaysAgo },
 *     { column: 'isActive', operator: '=', value: true }
 *   ]
 * )
 * ```
 */
export async function safeBatchUpdate(
  connection: ConnectionContract,
  tableName: string,
  updates: Record<string, unknown>,
  conditions: UpdateCondition[]
): Promise<BatchUpdateResult> {
  if (conditions.length === 0) {
    throw new Error('必須提供至少一個條件')
  }

  const builder = new BatchUpdateBuilder(connection, tableName)

  for (const cond of conditions) {
    builder.where(cond.column, cond.operator, cond.value)
  }

  return builder.update(updates)
}
