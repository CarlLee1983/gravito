/**
 * Sharding DAO Base Class
 * 分片數據訪問對象基類
 *
 * 職責：
 * 1. 封裝單分片查詢邏輯
 * 2. 提供跨分片聚合查詢
 * 3. 支持事務操作
 * 4. 自動路由到正確的分片
 */

import type { ShardDatabaseManager } from './ShardDatabaseManager'
import type { ShardingManager } from './ShardingManager'

export interface QueryOptions {
  shardId?: number // 指定分片 ID（如果不指定則自動計算）
  timeout?: number // 查詢超時時間
}

export interface AggregateOptions extends QueryOptions {
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max'
  field?: string // 聚合字段
}

/**
 * 分片 DAO 基類
 */
export abstract class ShardingDAO {
  protected shardingManager: ShardingManager
  protected databaseManager: ShardDatabaseManager
  protected tableName: string

  constructor(
    tableName: string,
    shardingManager: ShardingManager,
    databaseManager: ShardDatabaseManager
  ) {
    this.tableName = tableName
    this.shardingManager = shardingManager
    this.databaseManager = databaseManager
  }

  /**
   * 獲取完整的表名稱（帶 schema 前綴）
   */
  protected getFullTableName(shardId: number): string {
    return this.databaseManager.getConfig().getShardTableName(shardId, this.tableName)
  }

  /**
   * 單分片查詢
   */
  async query<T>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T[]> {
    const shardId = options.shardId ?? 0 // 如果不指定，使用第一個分片

    const startTime = Date.now()
    try {
      const result = await this.databaseManager.query(shardId, sql, params)
      const latency = Date.now() - startTime

      // 記錄指標
      this.shardingManager.recordQueryMetric(shardId, latency, true)

      return result as T[]
    } catch (error) {
      const latency = Date.now() - startTime
      this.shardingManager.recordQueryMetric(shardId, latency, false)
      throw error
    }
  }

  /**
   * 按分片鍵查詢
   */
  async queryByShardKey<T>(shardKeyValue: string, sql: string, params: any[] = []): Promise<T[]> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)
    return this.query<T>(sql, params, { shardId })
  }

  /**
   * 獲取單條記錄
   */
  async findOne<T>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T | null> {
    const results = await this.query<T>(sql, params, options)
    return results.length > 0 ? results[0] : null
  }

  /**
   * 按分片鍵獲取單條記錄
   */
  async findOneByShardKey<T>(
    shardKeyValue: string,
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)
    return this.findOne<T>(sql, params, { shardId })
  }

  /**
   * 跨分片查詢（並行執行所有分片）
   */
  async queryAll<T>(sql: string, params: any[] = []): Promise<Map<number, T[]>> {
    const results = await this.databaseManager.queryAll(sql, params)
    return results as Map<number, T[]>
  }

  /**
   * 跨分片聚合查詢
   */
  async aggregate(sql: string, params: any[] = [], options: AggregateOptions): Promise<number> {
    const results = await this.queryAll(sql, params)

    let aggregateValue = 0

    switch (options.aggregation) {
      case 'sum': {
        for (const shardResults of results.values()) {
          for (const row of shardResults) {
            const value = (row as any)[options.field || 'count']
            if (typeof value === 'number') {
              aggregateValue += value
            }
          }
        }
        break
      }

      case 'count': {
        for (const shardResults of results.values()) {
          aggregateValue += shardResults.length
        }
        break
      }

      case 'avg': {
        let sum = 0
        let count = 0
        for (const shardResults of results.values()) {
          for (const row of shardResults) {
            const value = (row as any)[options.field || 'value']
            if (typeof value === 'number') {
              sum += value
              count++
            }
          }
        }
        aggregateValue = count > 0 ? sum / count : 0
        break
      }

      case 'min': {
        aggregateValue = Number.MAX_SAFE_INTEGER
        for (const shardResults of results.values()) {
          for (const row of shardResults) {
            const value = (row as any)[options.field || 'value']
            if (typeof value === 'number' && value < aggregateValue) {
              aggregateValue = value
            }
          }
        }
        if (aggregateValue === Number.MAX_SAFE_INTEGER) {
          aggregateValue = 0
        }
        break
      }

      case 'max': {
        aggregateValue = Number.MIN_SAFE_INTEGER
        for (const shardResults of results.values()) {
          for (const row of shardResults) {
            const value = (row as any)[options.field || 'value']
            if (typeof value === 'number' && value > aggregateValue) {
              aggregateValue = value
            }
          }
        }
        if (aggregateValue === Number.MIN_SAFE_INTEGER) {
          aggregateValue = 0
        }
        break
      }
    }

    return aggregateValue
  }

  /**
   * 事務操作
   */
  async transaction<T>(shardKeyValue: string, callback: (trx: any) => Promise<T>): Promise<T> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)
    return this.databaseManager.transaction(shardId, callback)
  }

  /**
   * 插入記錄
   */
  async insert<T>(shardKeyValue: string, data: T): Promise<T> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)

    // 在實現中應使用實際的 INSERT SQL
    console.log(
      `[ShardingDAO] Insert into ${this.getFullTableName(shardId)}:`,
      JSON.stringify(data)
    )

    return data
  }

  /**
   * 更新記錄
   */
  async update<T>(shardKeyValue: string, id: any, data: Partial<T>): Promise<T> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)

    // 在實現中應使用實際的 UPDATE SQL
    console.log(
      `[ShardingDAO] Update ${this.getFullTableName(shardId)} where id=${id}:`,
      JSON.stringify(data)
    )

    return (data as any) || {}
  }

  /**
   * 刪除記錄
   */
  async delete(shardKeyValue: string, id: any): Promise<boolean> {
    const shardId = this.shardingManager.getShardId(shardKeyValue)

    // 在實現中應使用實際的 DELETE SQL
    console.log(`[ShardingDAO] Delete from ${this.getFullTableName(shardId)} where id=${id}`)

    return true
  }

  /**
   * 批量查詢多個分片鍵
   */
  async queryByShardKeys<T>(
    shardKeys: string[],
    sql: string,
    paramsFn: (shardKey: string) => any[]
  ): Promise<Map<string, T[]>> {
    const results = new Map<string, T[]>()

    const promises = shardKeys.map(async (key) => {
      try {
        const data = await this.queryByShardKey<T>(key, sql, paramsFn(key))
        results.set(key, data)
      } catch (error) {
        console.error(`[ShardingDAO] Error querying shard key ${key}:`, error)
        results.set(key, [])
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 獲取分片統計信息
   */
  getShardingStats() {
    return this.shardingManager.getStats()
  }
}
