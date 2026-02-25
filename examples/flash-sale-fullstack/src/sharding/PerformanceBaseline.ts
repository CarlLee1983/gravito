/**
 * Performance Baseline
 * 性能基準測試系統
 *
 * 職責：
 * 1. 單分片查詢性能測試
 * 2. 跨分片聚合性能測試
 * 3. 並發性能測試
 * 4. 負載分布驗證
 * 5. 性能報告生成
 */

export interface PerformanceTestConfig {
  duration: number // 測試時長 (秒)
  concurrency: number // 並發數
  queryType: 'single-shard' | 'cross-shard' | 'aggregation'
  recordCount?: number // 記錄數
  sampleSize?: number // 每個查詢返回的記錄數
}

export interface QueryLatencies {
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  p999: number
}

export interface PerformanceMetrics {
  queryType: string
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  successRate: number
  latencies: QueryLatencies
  throughput: number // QPS
  errors: Array<{ error: string; count: number }>
  duration: number // 毫秒
  timestamp: Date
}

export interface LoadDistribution {
  shardId: number
  queryCount: number
  percentage: number
  avgLatency: number
  p99Latency: number
}

export interface BaselineReport {
  timestamp: Date
  duration: number
  summary: {
    totalQueries: number
    totalTime: number
    overallThroughput: number
  }
  results: PerformanceMetrics[]
  loadDistribution: LoadDistribution[]
  recommendations: string[]
  status: 'passed' | 'warning' | 'failed'
}

/**
 * 性能基準測試系統
 */
export class PerformanceBaseline {
  private results: PerformanceMetrics[] = []
  private eventListeners: Map<string, Function[]> = new Map()

  /**
   * 運行單分片查詢性能測試
   */
  async testSingleShardQuery(config: PerformanceTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now()
    const latencies: number[] = []
    let successfulQueries = 0
    let failedQueries = 0
    const errors: Map<string, number> = new Map()

    this.emit('test:start', {
      queryType: 'single-shard',
      concurrency: config.concurrency,
    })

    // 並發查詢
    const promises = []
    for (let i = 0; i < config.concurrency; i++) {
      promises.push(
        this.runConcurrentQueries(config.duration * 1000, async () => {
          const queryStart = Date.now()
          try {
            // 模擬單分片查詢
            await this.simulateQuery(1) // 查詢 1 個分片

            const latency = Date.now() - queryStart
            latencies.push(latency)
            successfulQueries++

            return { success: true, latency }
          } catch (error) {
            failedQueries++
            const errorMsg = String(error)
            errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1)
            return { success: false }
          }
        })
      )
    }

    await Promise.all(promises)

    const duration = Date.now() - startTime
    const totalQueries = successfulQueries + failedQueries
    const metrics: PerformanceMetrics = {
      queryType: 'single-shard',
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate: (successfulQueries / totalQueries) * 100,
      latencies: this.calculateLatencies(latencies),
      throughput: successfulQueries / (duration / 1000),
      errors: Array.from(errors.entries()).map(([error, count]) => ({ error, count })),
      duration,
      timestamp: new Date(),
    }

    this.results.push(metrics)
    this.emit('test:completed', metrics)

    return metrics
  }

  /**
   * 運行跨分片聚合性能測試
   */
  async testCrossShardAggregation(config: PerformanceTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now()
    const latencies: number[] = []
    let successfulQueries = 0
    let failedQueries = 0
    const errors: Map<string, number> = new Map()

    this.emit('test:start', {
      queryType: 'cross-shard',
      concurrency: config.concurrency,
    })

    const promises = []
    for (let i = 0; i < config.concurrency; i++) {
      promises.push(
        this.runConcurrentQueries(config.duration * 1000, async () => {
          const queryStart = Date.now()
          try {
            // 模擬跨分片聚合查詢（查詢所有 8 個分片）
            await this.simulateQuery(8)

            const latency = Date.now() - queryStart
            latencies.push(latency)
            successfulQueries++

            return { success: true, latency }
          } catch (error) {
            failedQueries++
            const errorMsg = String(error)
            errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1)
            return { success: false }
          }
        })
      )
    }

    await Promise.all(promises)

    const duration = Date.now() - startTime
    const totalQueries = successfulQueries + failedQueries
    const metrics: PerformanceMetrics = {
      queryType: 'cross-shard',
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate: (successfulQueries / totalQueries) * 100,
      latencies: this.calculateLatencies(latencies),
      throughput: successfulQueries / (duration / 1000),
      errors: Array.from(errors.entries()).map(([error, count]) => ({ error, count })),
      duration,
      timestamp: new Date(),
    }

    this.results.push(metrics)
    this.emit('test:completed', metrics)

    return metrics
  }

  /**
   * 運行並發負載測試
   */
  async testConcurrentLoad(concurrencyLevels: number[]): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = []

    for (const concurrency of concurrencyLevels) {
      const latencies: number[] = []
      let successfulQueries = 0
      let failedQueries = 0

      this.emit('concurrency:test:start', { concurrency })

      const startTime = Date.now()
      const promises = []

      for (let i = 0; i < concurrency; i++) {
        promises.push(
          this.runConcurrentQueries(10000, async () => {
            const queryStart = Date.now()
            try {
              await this.simulateQuery(1)
              latencies.push(Date.now() - queryStart)
              successfulQueries++
              return { success: true }
            } catch {
              failedQueries++
              return { success: false }
            }
          })
        )
      }

      await Promise.all(promises)

      const duration = Date.now() - startTime
      const totalQueries = successfulQueries + failedQueries

      const metrics: PerformanceMetrics = {
        queryType: `concurrent-${concurrency}`,
        totalQueries,
        successfulQueries,
        failedQueries,
        successRate: (successfulQueries / totalQueries) * 100,
        latencies: this.calculateLatencies(latencies),
        throughput: successfulQueries / (duration / 1000),
        errors: [],
        duration,
        timestamp: new Date(),
      }

      results.push(metrics)
      this.emit('concurrency:test:completed', { concurrency, metrics })
    }

    return results
  }

  /**
   * 驗證負載分布
   */
  verifyLoadDistribution(queries: Array<{ shardId: number; latency: number }>): LoadDistribution[] {
    const shardStats = new Map<number, { count: number; latencies: number[] }>()

    for (let i = 0; i < 8; i++) {
      shardStats.set(i, { count: 0, latencies: [] })
    }

    for (const query of queries) {
      const stats = shardStats.get(query.shardId)!
      stats.count++
      stats.latencies.push(query.latency)
    }

    const distribution: LoadDistribution[] = []
    const totalQueries = queries.length

    for (let i = 0; i < 8; i++) {
      const stats = shardStats.get(i)!
      const latencies = stats.latencies.sort((a, b) => a - b)

      distribution.push({
        shardId: i,
        queryCount: stats.count,
        percentage: (stats.count / totalQueries) * 100,
        avgLatency: stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length || 0,
        p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
      })
    }

    return distribution.sort((a, b) => b.queryCount - a.queryCount)
  }

  /**
   * 運行並發查詢
   */
  private async runConcurrentQueries(duration: number, queryFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < duration) {
      await queryFn()
    }
  }

  /**
   * 模擬查詢執行
   */
  private async simulateQuery(shardCount: number): Promise<void> {
    // 模擬查詢時間（1-10ms，根據分片數）
    const baseLatency = 1
    const perShardLatency = 1
    const totalLatency = baseLatency + shardCount * perShardLatency + Math.random() * 5

    await new Promise((resolve) => setTimeout(resolve, totalLatency))
  }

  /**
   * 計算延遲統計
   */
  private calculateLatencies(latencies: number[]): QueryLatencies {
    if (latencies.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 }
    }

    const sorted = [...latencies].sort((a, b) => a - b)
    const len = sorted.length

    return {
      min: sorted[0],
      max: sorted[len - 1],
      avg: latencies.reduce((a, b) => a + b, 0) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      p999: sorted[Math.floor(len * 0.999)],
    }
  }

  /**
   * 生成性能報告
   */
  generateReport(): BaselineReport {
    const startTime = this.results.length > 0 ? this.results[0].timestamp : new Date()
    const endTime = new Date()
    const totalTime = endTime.getTime() - startTime.getTime()
    const totalQueries = this.results.reduce((sum, r) => sum + r.totalQueries, 0)
    const overallThroughput = totalQueries / (totalTime / 1000)

    // 驗證性能指標
    const recommendations: string[] = []
    let status: 'passed' | 'warning' | 'failed' = 'passed'

    for (const result of this.results) {
      if (result.queryType === 'single-shard') {
        if (result.latencies.p99 > 8) {
          recommendations.push(`⚠️ 單分片 P99 延遲 ${result.latencies.p99.toFixed(2)}ms > 8ms`)
          status = 'warning'
        }
      }

      if (result.queryType === 'cross-shard') {
        if (result.latencies.p99 > 50) {
          recommendations.push(`⚠️ 跨分片 P99 延遲 ${result.latencies.p99.toFixed(2)}ms > 50ms`)
          status = 'warning'
        }
      }

      if (result.successRate < 99.5) {
        recommendations.push(`❌ 成功率 ${result.successRate.toFixed(2)}% < 99.5%`)
        status = 'failed'
      }
    }

    if (overallThroughput < 10_000) {
      recommendations.push(`⚠️ 吞吐量 ${overallThroughput.toFixed(0)} QPS < 10,000`)
      status = status === 'failed' ? 'failed' : 'warning'
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 所有性能指標達到目標')
    }

    return {
      timestamp: startTime,
      duration: totalTime,
      summary: {
        totalQueries,
        totalTime,
        overallThroughput,
      },
      results: this.results,
      loadDistribution: [],
      recommendations,
      status,
    }
  }

  /**
   * 格式化報告
   */
  formatReport(report: BaselineReport): string {
    const lines = [
      '='.repeat(80),
      'PERFORMANCE BASELINE REPORT',
      '='.repeat(80),
      '',
      `Timestamp: ${report.timestamp.toISOString()}`,
      `Total Duration: ${(report.duration / 1000).toFixed(2)}s`,
      '',
      '--- SUMMARY ---',
      `Total Queries: ${report.summary.totalQueries}`,
      `Overall Throughput: ${report.summary.overallThroughput.toFixed(0)} QPS`,
      '',
      '--- DETAILED RESULTS ---',
    ]

    for (const result of report.results) {
      lines.push(``)
      lines.push(`Query Type: ${result.queryType}`)
      lines.push(`  Success Rate: ${result.successRate.toFixed(2)}%`)
      lines.push(`  Throughput: ${result.throughput.toFixed(0)} QPS`)
      lines.push(`  Latencies:`)
      lines.push(`    Min: ${result.latencies.min.toFixed(2)}ms`)
      lines.push(`    Avg: ${result.latencies.avg.toFixed(2)}ms`)
      lines.push(`    P95: ${result.latencies.p95.toFixed(2)}ms`)
      lines.push(`    P99: ${result.latencies.p99.toFixed(2)}ms`)
      lines.push(`    P99.9: ${result.latencies.p999.toFixed(2)}ms`)
      lines.push(`    Max: ${result.latencies.max.toFixed(2)}ms`)

      if (result.errors.length > 0) {
        lines.push(`  Errors:`)
        for (const error of result.errors.slice(0, 3)) {
          lines.push(`    - ${error.error}: ${error.count}`)
        }
      }
    }

    lines.push('')
    lines.push('--- RECOMMENDATIONS ---')
    for (const rec of report.recommendations) {
      lines.push(rec)
    }

    lines.push('')
    lines.push(`Status: ${report.status.toUpperCase()}`)
    lines.push('='.repeat(80))

    return lines.join('\n')
  }

  /**
   * 重置結果
   */
  reset(): void {
    this.results = []
  }

  /**
   * 獲取結果
   */
  getResults(): PerformanceMetrics[] {
    return [...this.results]
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[PerformanceBaseline] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
