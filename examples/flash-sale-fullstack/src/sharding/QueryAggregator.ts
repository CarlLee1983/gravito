/**
 * Query Aggregator
 * 跨分片查詢聚合器
 *
 * 職責：
 * 1. 並行執行跨分片查詢
 * 2. 聚合結果（SUM、COUNT、AVG、MIN、MAX）
 * 3. 處理部分故障
 * 4. 提供結果統計
 */

import type { ShardDatabaseManager } from './ShardDatabaseManager'

export interface AggregationResult {
  aggregationType: 'sum' | 'count' | 'avg' | 'min' | 'max'
  value: number
  totalShards: number
  successfulShards: number
  failedShards: number
  executionTime: number
  shardResults: Map<number, number>
}

export interface FilterCriteria {
  where?: Record<string, any>
  limit?: number
  offset?: number
}

/**
 * 查詢聚合器
 */
export class QueryAggregator {
  private databaseManager: ShardDatabaseManager

  constructor(databaseManager: ShardDatabaseManager) {
    this.databaseManager = databaseManager
  }

  /**
   * 執行聚合查詢（SUM）
   */
  async sum(sql: string, params: any[] = []): Promise<AggregationResult> {
    return this.aggregate('sum', sql, params, 'total')
  }

  /**
   * 執行計數查詢（COUNT）
   */
  async count(sql: string, params: any[] = []): Promise<AggregationResult> {
    return this.aggregate('count', sql, params)
  }

  /**
   * 執行平均值查詢（AVG）
   */
  async average(sql: string, params: any[] = [], field = 'value'): Promise<AggregationResult> {
    return this.aggregate('avg', sql, params, field)
  }

  /**
   * 執行最小值查詢（MIN）
   */
  async minimum(sql: string, params: any[] = [], field = 'value'): Promise<AggregationResult> {
    return this.aggregate('min', sql, params, field)
  }

  /**
   * 執行最大值查詢（MAX）
   */
  async maximum(sql: string, params: any[] = [], field = 'value'): Promise<AggregationResult> {
    return this.aggregate('max', sql, params, field)
  }

  /**
   * 核心聚合邏輯
   */
  private async aggregate(
    aggregationType: 'sum' | 'count' | 'avg' | 'min' | 'max',
    sql: string,
    params: any[],
    field?: string
  ): Promise<AggregationResult> {
    const startTime = Date.now()
    const shardResults = new Map<number, number>()
    let successfulShards = 0
    let failedShards = 0

    // 並行查詢所有分片
    const promises = []
    for (let i = 0; i < this.databaseManager.getConfig().shardCount; i++) {
      promises.push(
        this.queryShardForAggregation(i, sql, params, aggregationType, field)
          .then((value) => {
            shardResults.set(i, value)
            successfulShards++
          })
          .catch((error) => {
            console.error(`[QueryAggregator] Error on shard ${i}:`, error)
            shardResults.set(i, 0)
            failedShards++
          })
      )
    }

    await Promise.all(promises)

    // 聚合結果
    const aggregatedValue = this.aggregateValues(aggregationType, shardResults)
    const executionTime = Date.now() - startTime

    return {
      aggregationType,
      value: aggregatedValue,
      totalShards: this.databaseManager.getConfig().shardCount,
      successfulShards,
      failedShards,
      executionTime,
      shardResults,
    }
  }

  /**
   * 從單個分片查詢聚合值
   */
  private async queryShardForAggregation(
    shardId: number,
    sql: string,
    params: any[],
    aggregationType: string,
    field?: string
  ): Promise<number> {
    const results = await this.databaseManager.query(shardId, sql, params)

    if (results.length === 0) {
      return aggregationType === 'count' ? 0 : 0
    }

    const row = results[0] as Record<string, any>

    switch (aggregationType) {
      case 'sum': {
        const fieldName = field || 'total'
        return Number(row[fieldName]) || 0
      }

      case 'count': {
        const countField = row.count || row.COUNT || results.length
        return Number(countField) || 0
      }

      case 'avg': {
        const fieldName = field || 'avg'
        return Number(row[fieldName]) || 0
      }

      case 'min': {
        const fieldName = field || 'min'
        return Number(row[fieldName]) || 0
      }

      case 'max': {
        const fieldName = field || 'max'
        return Number(row[fieldName]) || 0
      }

      default:
        return 0
    }
  }

  /**
   * 聚合所有分片的結果
   */
  private aggregateValues(aggregationType: string, shardResults: Map<number, number>): number {
    const values = Array.from(shardResults.values()).filter((v) => v !== undefined && v !== null)

    if (values.length === 0) {
      return 0
    }

    switch (aggregationType) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0)

      case 'count':
        return values.reduce((sum, val) => sum + val, 0)

      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length

      case 'min':
        return Math.min(...values)

      case 'max':
        return Math.max(...values)

      default:
        return 0
    }
  }

  /**
   * 獲取所有分片的記錄集合（並集）
   */
  async union<T>(sql: string, params: any[] = []): Promise<T[]> {
    const startTime = Date.now()
    const allRecords: T[] = []

    const results = await this.databaseManager.queryAll(sql, params)

    for (const records of results.values()) {
      allRecords.push(...(records as T[]))
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[QueryAggregator] Union query completed: ${allRecords.length} records in ${executionTime}ms`
    )

    return allRecords
  }

  /**
   * 獲取所有分片的去重記錄集合
   */
  async distinct<T>(sql: string, params: any[] = [], key: keyof T): Promise<T[]> {
    const allRecords = await this.union<T>(sql, params)
    const seen = new Set<any>()
    const distinctRecords: T[] = []

    for (const record of allRecords) {
      const keyValue = record[key]
      if (!seen.has(keyValue)) {
        seen.add(keyValue)
        distinctRecords.push(record)
      }
    }

    return distinctRecords
  }

  /**
   * 執行分組聚合
   */
  async groupBy<T extends Record<string, any>>(
    sql: string,
    params: any[],
    groupKey: string
  ): Promise<Map<string, T[]>> {
    const results = await this.union<T>(sql, params)
    const grouped = new Map<string, T[]>()

    for (const record of results) {
      const key = String(record[groupKey] || 'unknown')
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)?.push(record)
    }

    return grouped
  }

  /**
   * 執行排序和限制
   */
  async sortAndLimit<T extends Record<string, any>>(
    sql: string,
    params: any[],
    sortKey: keyof T,
    descending = true,
    limit = 10
  ): Promise<T[]> {
    const allRecords = await this.union<T>(sql, params)

    // 排序
    allRecords.sort((a, b) => {
      const aVal = a[sortKey] as any
      const bVal = b[sortKey] as any

      if (aVal < bVal) {
        return descending ? 1 : -1
      }
      if (aVal > bVal) {
        return descending ? -1 : 1
      }
      return 0
    })

    // 限制
    return allRecords.slice(0, limit)
  }

  /**
   * 獲取統計信息
   */
  getStats() {
    return this.databaseManager.getStats()
  }
}
