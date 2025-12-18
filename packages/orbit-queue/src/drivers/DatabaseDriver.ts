import type { DBService } from '@gravito/orbit-db'
import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Database Driver 配置
 */
export interface DatabaseDriverConfig {
  /**
   * 資料表名稱（預設：'jobs'）
   */
  table?: string

  /**
   * DBService 實例（從 orbit-db 取得）
   * 如果未提供，會嘗試從 Context 取得
   */
  dbService?: DBService
}

/**
 * Database Driver
 *
 * 使用資料庫作為隊列儲存。
 * 重用 `orbit-db` 的資料庫連接，不建立新連接。
 *
 * **要求**：需要先安裝並配置 `@gravito/orbit-db`。
 *
 * @example
 * ```typescript
 * // 從 Context 取得 DBService
 * const dbService = c.get('db')
 * const driver = new DatabaseDriver({ dbService, table: 'jobs' })
 *
 * await driver.push('default', serializedJob)
 * ```
 */
export class DatabaseDriver implements QueueDriver {
  private tableName: string
  private dbService: DBService

  constructor(config: DatabaseDriverConfig) {
    this.tableName = config.table ?? 'jobs'
    this.dbService = config.dbService!

    if (!this.dbService) {
      throw new Error(
        '[DatabaseDriver] DBService is required. Please provide dbService in config or ensure @gravito/orbit-db is installed.'
      )
    }
  }

  /**
   * 推送 Job 到隊列
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const availableAt = job.delaySeconds
      ? new Date(Date.now() + job.delaySeconds * 1000)
      : new Date()

    // 使用 DBService 的 execute 方法執行原始 SQL
    await this.dbService.execute(
      `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [queue, job.data, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
    )
  }

  /**
   * 從隊列取出 Job（FIFO，支援延遲）
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    // 使用 SELECT FOR UPDATE 來鎖定行（PostgreSQL/MySQL）
    // 注意：SKIP LOCKED 是 PostgreSQL 特定功能，MySQL 8.0+ 也支援
    // 對於不支援 SKIP LOCKED 的資料庫，會降級為普通 SELECT
    const result = await this.dbService
      .execute<{
        id: string
        payload: string
        attempts: number
        created_at: Date
        available_at: Date
      }>(
        `SELECT id, payload, attempts, created_at, available_at
       FROM ${this.tableName}
       WHERE queue = $1
         AND available_at <= NOW()
         AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
        [queue]
      )
      .catch(() => {
        // 降級：不支援 SKIP LOCKED 的資料庫
        return this.dbService.execute<{
          id: string
          payload: string
          attempts: number
          created_at: Date
          available_at: Date
        }>(
          `SELECT id, payload, attempts, created_at, available_at
         FROM ${this.tableName}
         WHERE queue = $1
           AND available_at <= NOW()
           AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
          [queue]
        )
      })

    if (!result || result.length === 0) {
      return null
    }

    const row = result[0]!

    // 標記為已保留
    await this.dbService.execute(
      `UPDATE ${this.tableName}
       SET reserved_at = NOW()
       WHERE id = $1`,
      [row.id]
    )

    // 計算延遲時間
    const createdAt = new Date(row.created_at).getTime()
    const delaySeconds = row.available_at
      ? Math.max(0, Math.floor((new Date(row.available_at).getTime() - createdAt) / 1000))
      : undefined

    return {
      id: row.id,
      type: 'class', // 預設，實際應該從 payload 解析
      data: row.payload,
      createdAt,
      attempts: row.attempts,
      delaySeconds,
    }
  }

  /**
   * 取得隊列大小
   */
  async size(queue: string): Promise<number> {
    const result = await this.dbService.execute<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM ${this.tableName}
       WHERE queue = $1
         AND available_at <= NOW()
         AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')`,
      [queue]
    )

    return result?.[0]?.count ?? 0
  }

  /**
   * 清空隊列
   */
  async clear(queue: string): Promise<void> {
    await this.dbService.execute(`DELETE FROM ${this.tableName} WHERE queue = $1`, [queue])
  }

  /**
   * 批量推送 Job
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // 使用事務批量插入
    await this.dbService.transaction(async (tx) => {
      for (const job of jobs) {
        const availableAt = job.delaySeconds
          ? new Date(Date.now() + job.delaySeconds * 1000)
          : new Date()

        await tx.execute(
          `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [queue, job.data, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
        )
      }
    })
  }
}
