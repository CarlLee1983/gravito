import type { KafkaDriverMetrics, MetricsConfig } from './types'

/**
 * Kafka driver metrics collector.
 *
 * Tracks throughput, latency, errors, buffer utilization, and rate limit statistics.
 * Uses a circular buffer for latency histogram to prevent unbounded memory growth.
 *
 * @public
 */
export class KafkaMetrics {
  private readonly enabled: boolean
  private readonly histogramSize: number

  // 延遲直方圖（圓形緩衝區）
  private readonly latencyBuffer: number[]
  private latencyIndex = 0
  private latencyCount = 0

  // 每佇列訊息計數和時間戳
  private readonly queueCounts = new Map<string, number>()
  private readonly queueTimestamps = new Map<string, number[]>()

  // 錯誤計數
  private readonly errorCounts = {
    total: 0,
    serialization: 0,
    callback: 0,
    connection: 0,
    timeout: 0,
  }

  // 速率限制計數
  private readonly rateLimitCounts = new Map<
    string,
    { allowed: number; denied: number }
  >()
  private rateLimitTotalAllowed = 0
  private rateLimitTotalDenied = 0

  // 緩衝區利用率
  private readonly bufferSizes = new Map<string, number>()
  private bufferCapacity = 0

  // 全域計數器
  private totalProcessed = 0
  private totalFailed = 0
  private inFlight = 0

  // Consumer lag
  private readonly lagMap = new Map<string, number>()

  // 吞吐量計算時間窗口
  private lastSnapshotTime = Date.now()

  constructor(config: MetricsConfig = {}) {
    this.enabled = config.enabled ?? true
    this.histogramSize = config.histogramSize ?? 100
    this.latencyBuffer = new Array<number>(this.histogramSize).fill(0)
  }

  /**
   * 記錄已處理訊息（含延遲）。
   */
  recordMessage(queue: string, latencyMs: number): void {
    if (!this.enabled) return

    // 更新佇列計數
    this.queueCounts.set(
      queue,
      (this.queueCounts.get(queue) ?? 0) + 1,
    )

    // 記錄時間戳供吞吐量計算
    const timestamps = this.queueTimestamps.get(queue) ?? []
    timestamps.push(Date.now())
    this.queueTimestamps.set(queue, timestamps)

    // 寫入圓形延遲緩衝區
    this.latencyBuffer[this.latencyIndex % this.histogramSize] =
      latencyMs
    this.latencyIndex++
    this.latencyCount++

    // 全域計數
    this.totalProcessed++
  }

  /**
   * 記錄錯誤（按類型追蹤）。
   */
  recordError(
    type: 'serialization' | 'callback' | 'connection' | 'timeout',
  ): void {
    if (!this.enabled) return

    this.errorCounts.total++
    this.errorCounts[type]++
    this.totalFailed++
  }

  /**
   * 記錄速率限制決定。
   */
  recordRateLimitHit(queue: string, allowed: boolean): void {
    if (!this.enabled) return

    let counts = this.rateLimitCounts.get(queue)
    if (!counts) {
      counts = { allowed: 0, denied: 0 }
      this.rateLimitCounts.set(queue, counts)
    }

    if (allowed) {
      counts.allowed++
      this.rateLimitTotalAllowed++
    } else {
      counts.denied++
      this.rateLimitTotalDenied++
    }
  }

  /**
   * 更新緩衝區大小（由外部呼叫以追蹤利用率）。
   */
  updateBufferSize(
    queue: string,
    size: number,
    capacity: number,
  ): void {
    this.bufferSizes.set(queue, size)
    this.bufferCapacity = capacity
  }

  /**
   * 更新 consumer lag。
   */
  updateLag(topicPartition: string, lag: number): void {
    this.lagMap.set(topicPartition, lag)
  }

  /**
   * 更新 in-flight 計數。
   */
  setInFlight(count: number): void {
    this.inFlight = count
  }

  /**
   * 計算並返回當前指標快照（不可變）。
   */
  getSnapshot(): KafkaDriverMetrics {
    const now = Date.now()
    const intervalMs = now - this.lastSnapshotTime

    // 計算吞吐量
    const throughput = this.calculateThroughput(intervalMs)

    // 計算延遲百分位數
    const latencyData = this.getLatencyData()
    const sorted = [...latencyData].sort((a, b) => a - b)

    const latency =
      sorted.length === 0
        ? { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 }
        : {
            p50: this.calculatePercentile(sorted, 50),
            p95: this.calculatePercentile(sorted, 95),
            p99: this.calculatePercentile(sorted, 99),
            avg:
              sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
            min: sorted[0]!,
            max: sorted[sorted.length - 1]!,
          }

    // 計算緩衝區利用率
    let totalBufferSize = 0
    const perQueue: Record<string, number> = {}
    for (const [queue, size] of this.bufferSizes.entries()) {
      totalBufferSize += size
      perQueue[queue] = size
    }

    const utilization =
      this.bufferCapacity > 0
        ? totalBufferSize / this.bufferCapacity
        : 0

    // 組裝速率限制快照
    const rateLimitPerQueue: Record<
      string,
      { allowed: number; denied: number }
    > = {}
    for (const [queue, counts] of this.rateLimitCounts.entries()) {
      rateLimitPerQueue[queue] = { ...counts }
    }

    // 組裝 lag 快照
    const lag: Record<string, number> = {}
    for (const [key, value] of this.lagMap.entries()) {
      lag[key] = value
    }

    // 更新快照時間
    this.lastSnapshotTime = now

    return {
      timestamp: now,
      throughput,
      lag,
      errors: { ...this.errorCounts },
      latency,
      buffer: {
        totalSize: totalBufferSize,
        perQueue,
        utilization: Math.min(1, Math.max(0, utilization)),
      },
      rateLimits: {
        totalAllowed: this.rateLimitTotalAllowed,
        totalDenied: this.rateLimitTotalDenied,
        perQueue: rateLimitPerQueue,
      },
      inFlight: this.inFlight,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
    }
  }

  /**
   * 清除所有計數器。
   */
  reset(): void {
    this.latencyBuffer.fill(0)
    this.latencyIndex = 0
    this.latencyCount = 0
    this.queueCounts.clear()
    this.queueTimestamps.clear()
    this.errorCounts.total = 0
    this.errorCounts.serialization = 0
    this.errorCounts.callback = 0
    this.errorCounts.connection = 0
    this.errorCounts.timeout = 0
    this.rateLimitCounts.clear()
    this.rateLimitTotalAllowed = 0
    this.rateLimitTotalDenied = 0
    this.bufferSizes.clear()
    this.bufferCapacity = 0
    this.totalProcessed = 0
    this.totalFailed = 0
    this.inFlight = 0
    this.lagMap.clear()
    this.lastSnapshotTime = Date.now()
  }

  /**
   * 從圓形緩衝區取出有效延遲資料。
   */
  private getLatencyData(): number[] {
    const count = Math.min(this.latencyCount, this.histogramSize)
    if (count === 0) return []

    // 如果尚未溢位，取前 count 個
    if (this.latencyCount <= this.histogramSize) {
      return this.latencyBuffer.slice(0, count)
    }

    // 溢位後，整個緩衝區都是有效資料
    return [...this.latencyBuffer]
  }

  /**
   * 計算百分位數（輸入必須已排序）。
   */
  private calculatePercentile(
    sorted: number[],
    percentile: number,
  ): number {
    if (sorted.length === 0) return 0
    if (sorted.length === 1) return sorted[0]!

    const index = (percentile / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) return sorted[lower]!

    // 線性插值
    const weight = index - lower
    return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
  }

  /**
   * 計算每佇列吞吐量（messages/second）。
   * 使用最小 1 秒窗口以避免極短間隔時的數值不穩定。
   */
  private calculateThroughput(
    intervalMs: number,
  ): Record<string, number> {
    const result: Record<string, number> = {}

    // 使用最小 1 秒窗口，確保剛記錄的訊息不會被過濾掉
    const effectiveInterval = Math.max(intervalMs, 1000)
    const now = Date.now()
    const windowStart = now - effectiveInterval

    for (const [queue, timestamps] of this.queueTimestamps.entries()) {
      // 只計算窗口內的訊息
      const recentCount = timestamps.filter(
        (ts) => ts >= windowStart,
      ).length

      if (recentCount > 0) {
        result[queue] = (recentCount / effectiveInterval) * 1000
      }

      // 清理過期時間戳（保留窗口內的）
      this.queueTimestamps.set(
        queue,
        timestamps.filter((ts) => ts >= windowStart),
      )
    }

    return result
  }
}
