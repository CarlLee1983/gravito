/**
 * BulkInsertBuilder - 批量插入優化工具
 *
 * 提供高效的批量插入操作，具有自動分批、參數綁定與錯誤恢復。
 *
 * @example
 * ```typescript
 * const builder = new BulkInsertBuilder(connection, 'users', 1000)
 *
 * for (const user of userList) {
 *   await builder.add({
 *     name: user.name,
 *     email: user.email,
 *     createdAt: new Date()
 *   })
 * }
 *
 * const result = await builder.execute()
 * console.log(`Inserted ${result.totalInserted} records`)
 * ```
 */

import type { ConnectionContract } from '@gravito/atlas'

export interface BulkInsertOptions {
  /** 每批的記錄數（預設: 1000） */
  batchSize?: number
  /** 插入失敗時是否繼續 */
  continueOnError?: boolean
  /** 進度回調 */
  onProgress?: (inserted: number, total: number) => void
  /** 錯誤回調 */
  onError?: (error: Error, batchIndex: number) => void
}

export interface BulkInsertResult {
  /** 總共插入的記錄數 */
  totalInserted: number
  /** 總共的記錄數 */
  totalRecords: number
  /** 失敗的記錄數 */
  failedRecords: number
  /** 執行時間（毫秒） */
  duration: number
  /** 失敗的詳情 */
  errors: Array<{ batchIndex: number; error: Error }>
}

export class BulkInsertBuilder {
  private records: Record<string, unknown>[] = []
  private batchSize: number
  private continueOnError: boolean
  private onProgress?: (inserted: number, total: number) => void
  private onError?: (error: Error, batchIndex: number) => void

  constructor(
    private connection: ConnectionContract,
    private tableName: string,
    options: BulkInsertOptions = {}
  ) {
    this.batchSize = options.batchSize || 1000
    this.continueOnError = options.continueOnError ?? false
    this.onProgress = options.onProgress
    this.onError = options.onError
  }

  /**
   * 新增記錄到批次
   *
   * ✅ 自動管理記憶體：達到 batchSize 時自動執行
   */
  async add(record: Record<string, unknown>): Promise<void> {
    this.records.push(record)

    // 達到批次大小時，自動執行
    if (this.records.length >= this.batchSize) {
      await this.flush()
    }
  }

  /**
   * 新增多個記錄
   */
  async addMany(records: Record<string, unknown>[]): Promise<void> {
    for (const record of records) {
      await this.add(record)
    }
  }

  /**
   * 執行當前批次的插入
   *
   * ✅ 參數綁定：所有值都被正確綁定
   */
  private async flush(): Promise<void> {
    if (this.records.length === 0) return

    const recordsToInsert = this.records.splice(0, this.records.length)

    if (recordsToInsert.length === 0) return

    try {
      // 建立 VALUES 子句
      const columns = Object.keys(recordsToInsert[0])
      const values = recordsToInsert
        .map(
          (_, idx) =>
            `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
        )
        .join(', ')

      // 展平所有值用於參數綁定
      const flatValues = recordsToInsert.flatMap((record) => columns.map((col) => record[col]))

      // 執行插入
      const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${values}`

      await this.connection.raw(sql, flatValues)
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error, 0)
      }

      if (!this.continueOnError) {
        throw error
      }
    }
  }

  /**
   * 執行完整的批量插入
   *
   * ✅ 進度追蹤：定期回調進度
   * ✅ 錯誤恢復：支援繼續或中止
   */
  async execute(): Promise<BulkInsertResult> {
    const startTime = performance.now()
    const totalRecords = this.records.length
    let totalInserted = 0
    let failedRecords = 0
    const errors: Array<{ batchIndex: number; error: Error }> = []

    try {
      // 執行剩餘的記錄
      while (this.records.length > 0) {
        const batchRecords = this.records.splice(0, this.batchSize)

        try {
          const columns = Object.keys(batchRecords[0])
          const values = batchRecords
            .map(
              (_, idx) =>
                `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
            )
            .join(', ')

          const flatValues = batchRecords.flatMap((record) => columns.map((col) => record[col]))

          const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${values}`

          const result = await this.connection.raw(sql, flatValues)
          totalInserted += result.rowCount || batchRecords.length

          // 進度回調
          if (this.onProgress) {
            this.onProgress(totalInserted, totalRecords)
          }
        } catch (error) {
          failedRecords += batchRecords.length
          const batchIndex = Math.floor(totalInserted / this.batchSize)
          errors.push({ batchIndex, error: error as Error })

          if (this.onError) {
            this.onError(error as Error, batchIndex)
          }

          if (!this.continueOnError) {
            throw error
          }
        }
      }
    } finally {
      // 清空未插入的記錄
      this.records = []
    }

    const endTime = performance.now()

    return {
      totalInserted,
      totalRecords,
      failedRecords,
      duration: endTime - startTime,
      errors,
    }
  }

  /**
   * 取得當前待插入的記錄數
   */
  getPendingCount(): number {
    return this.records.length
  }
}

/**
 * 便利函數：一次性批量插入
 *
 * @example
 * ```typescript
 * const result = await bulkInsert(connection, 'users', users, {
 *   batchSize: 5000,
 *   onProgress: (inserted, total) => {
 *     console.log(`Progress: ${inserted}/${total}`)
 *   }
 * })
 * ```
 */
export async function bulkInsert(
  connection: ConnectionContract,
  tableName: string,
  records: Record<string, unknown>[],
  options: BulkInsertOptions = {}
): Promise<BulkInsertResult> {
  const builder = new BulkInsertBuilder(connection, tableName, options)

  await builder.addMany(records)
  return builder.execute()
}
