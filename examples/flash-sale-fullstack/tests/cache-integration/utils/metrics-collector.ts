/**
 * 性能指標收集器
 * 用於集成測試中收集延遲、吞吐量、命中率等指標
 */

export interface PerformanceMetrics {
  latencies: number[]
  throughput: number
  hitRate: number
  p50: number
  p95: number
  p99: number
  average: number
  min: number
  max: number
  totalRequests: number
  cacheHits: number
  duration: number
}

export class MetricsCollector {
  private latencies: number[] = []
  private totalRequests = 0
  private cacheHits = 0
  private startTime = 0
  private endTime = 0

  /**
   * 記錄一次請求的延遲
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs)
  }

  /**
   * 記錄快取命中
   */
  recordHit(): void {
    this.cacheHits++
    this.totalRequests++
  }

  /**
   * 記錄快取未命中
   */
  recordMiss(): void {
    this.totalRequests++
  }

  /**
   * 標記測試開始
   */
  startTimer(): void {
    this.startTime = Date.now()
  }

  /**
   * 標記測試結束
   */
  endTimer(): void {
    this.endTime = Date.now()
  }

  /**
   * 計算百分位數
   */
  private percentile(p: number): number {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * 獲取所有統計數據
   */
  getStats(): PerformanceMetrics {
    const sorted = this.latencies.length > 0 ? [...this.latencies].sort((a, b) => a - b) : []
    const durationMs = Math.max(1, this.endTime - this.startTime)
    const durationSeconds = durationMs / 1000
    const throughput =
      this.totalRequests > 0 && durationSeconds > 0 ? this.totalRequests / durationSeconds : 0

    return {
      latencies: this.latencies,
      throughput,
      hitRate: this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
      p50: this.latencies.length > 0 ? this.percentile(50) : 0,
      p95: this.latencies.length > 0 ? this.percentile(95) : 0,
      p99: this.latencies.length > 0 ? this.percentile(99) : 0,
      average:
        this.latencies.length > 0
          ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
          : 0,
      min: sorted.length > 0 ? sorted[0] : 0,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      duration: durationMs,
    }
  }

  /**
   * 重置收集器
   */
  reset(): void {
    this.latencies = []
    this.totalRequests = 0
    this.cacheHits = 0
    this.startTime = 0
    this.endTime = 0
  }

  /**
   * 格式化統計數據為可讀字符串
   */
  formatStats(): string {
    const stats = this.getStats()
    return `
性能統計：
  吞吐量: ${stats.throughput.toFixed(2)} QPS
  命中率: ${(stats.hitRate * 100).toFixed(2)}%
  平均延遲: ${stats.average.toFixed(3)}ms
  P50 延遲: ${stats.p50.toFixed(3)}ms
  P95 延遲: ${stats.p95.toFixed(3)}ms
  P99 延遲: ${stats.p99.toFixed(3)}ms
  最小延遲: ${stats.min.toFixed(3)}ms
  最大延遲: ${stats.max.toFixed(3)}ms
  總請求數: ${this.totalRequests}
  命中數: ${this.cacheHits}
    `
  }
}
