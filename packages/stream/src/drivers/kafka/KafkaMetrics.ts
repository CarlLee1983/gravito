import type { KafkaDriverMetrics, MetricsConfig } from './types'

/**
 * Number of throughput buckets (each = 1 second).
 * Covers a sliding window of BUCKET_COUNT seconds.
 */
const BUCKET_COUNT = 10
const BUCKET_DURATION_MS = 1000

/**
 * Kafka driver metrics collector.
 *
 * Tracks throughput, latency, errors, buffer utilization, and rate limit statistics.
 * Uses a circular buffer for latency histogram to prevent unbounded memory growth.
 *
 * Performance optimizations (Phase 6E-2):
 * - Bucket counter throughput: O(buckets) snapshot instead of O(messages) timestamp filter
 * - No per-message timestamp storage: constant memory for throughput tracking
 * - recordMessage() hot path: O(1) bucket increment + circular buffer write
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

  // 桶計數器吞吐量追蹤（取代時間戳陣列）
  // 每佇列: 固定大小 BUCKET_COUNT 陣列 + 當前桶索引
  private readonly queueBuckets = new Map<
    string,
    { counts: number[]; currentBucket: number; bucketStartMs: number }
  >()

  // 每佇列訊息計數
  private readonly queueCounts = new Map<string, number>()

  // 錯誤計數
  private readonly errorCounts = {
    total: 0,
    serialization: 0,
    callback: 0,
    connection: 0,
    timeout: 0,
  }

  // 速率限制計數
  private readonly rateLimitCounts = new Map<string, { allowed: number; denied: number }>()
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

  constructor(config: MetricsConfig = {}) {
    this.enabled = config.enabled ?? true
    this.histogramSize = config.histogramSize ?? 100
    this.latencyBuffer = new Array<number>(this.histogramSize).fill(0)
  }

  /**
   * 記錄已處理訊息（含延遲）。
   * Hot path: O(1) 桶遞增 + 圓形緩衝區寫入。
   */
  recordMessage(queue: string, latencyMs: number): void {
    if (!this.enabled) {
      return
    }

    // 更新佇列計數
    this.queueCounts.set(queue, (this.queueCounts.get(queue) ?? 0) + 1)

    // 桶計數器更新（取代時間戳陣列）
    this.incrementBucket(queue)

    // 寫入圓形延遲緩衝區
    this.latencyBuffer[this.latencyIndex % this.histogramSize] = latencyMs
    this.latencyIndex++
    this.latencyCount++

    // 全域計數
    this.totalProcessed++
  }

  /**
   * 記錄錯誤（按類型追蹤）。
   */
  recordError(type: 'serialization' | 'callback' | 'connection' | 'timeout'): void {
    if (!this.enabled) {
      return
    }

    this.errorCounts.total++
    this.errorCounts[type]++
    this.totalFailed++
  }

  /**
   * 記錄速率限制決定。
   */
  recordRateLimitHit(queue: string, allowed: boolean): void {
    if (!this.enabled) {
      return
    }

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
  updateBufferSize(queue: string, size: number, capacity: number): void {
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
   * 吞吐量計算: O(queues * BUCKET_COUNT) 取代 O(total_messages)。
   */
  getSnapshot(): KafkaDriverMetrics {
    const now = Date.now()

    // 計算吞吐量（桶計數器版）
    const throughput = this.calculateThroughput(now)

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
            avg: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
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

    const utilization = this.bufferCapacity > 0 ? totalBufferSize / this.bufferCapacity : 0

    // 組裝速率限制快照
    const rateLimitPerQueue: Record<string, { allowed: number; denied: number }> = {}
    for (const [queue, counts] of this.rateLimitCounts.entries()) {
      rateLimitPerQueue[queue] = { ...counts }
    }

    // 組裝 lag 快照
    const lag: Record<string, number> = {}
    for (const [key, value] of this.lagMap.entries()) {
      lag[key] = value
    }

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
    this.queueBuckets.clear()
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
  }

  /**
   * 從圓形緩衝區取出有效延遲資料。
   */
  private getLatencyData(): number[] {
    const count = Math.min(this.latencyCount, this.histogramSize)
    if (count === 0) {
      return []
    }

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
  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) {
      return 0
    }
    if (sorted.length === 1) {
      return sorted[0]!
    }

    const index = (percentile / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) {
      return sorted[lower]!
    }

    // 線性插值
    const weight = index - lower
    return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
  }

  /**
   * 遞增當前時間桶的計數。O(1) 操作。
   *
   * 桶結構: 固定 BUCKET_COUNT 個桶，每桶代表 BUCKET_DURATION_MS 的時間段。
   * 當時間推進到新桶時，清零已過期的桶。
   */
  private incrementBucket(queue: string): void {
    const now = Date.now()
    let state = this.queueBuckets.get(queue)

    if (!state) {
      state = {
        counts: new Array(BUCKET_COUNT).fill(0),
        currentBucket: 0,
        bucketStartMs: now,
      }
      this.queueBuckets.set(queue, state)
    }

    // 計算目前應處於哪個桶
    const elapsed = now - state.bucketStartMs
    const bucketsAdvanced = Math.floor(elapsed / BUCKET_DURATION_MS)

    if (bucketsAdvanced > 0) {
      // 時間推進 - 清零已過期的桶
      const toClear = Math.min(bucketsAdvanced, BUCKET_COUNT)
      for (let i = 1; i <= toClear; i++) {
        state.counts[(state.currentBucket + i) % BUCKET_COUNT] = 0
      }
      state.currentBucket = (state.currentBucket + bucketsAdvanced) % BUCKET_COUNT
      state.bucketStartMs = now - (elapsed % BUCKET_DURATION_MS)
    }

    state.counts[state.currentBucket]++
  }

  /**
   * 計算每佇列吞吐量（messages/second）。
   * O(queues * BUCKET_COUNT) - 固定成本，不隨訊息數增長。
   */
  private calculateThroughput(now: number): Record<string, number> {
    const result: Record<string, number> = {}

    for (const [queue, state] of this.queueBuckets.entries()) {
      // 先推進桶，確保過期桶被清零
      const elapsed = now - state.bucketStartMs
      const bucketsAdvanced = Math.floor(elapsed / BUCKET_DURATION_MS)

      if (bucketsAdvanced > 0) {
        const toClear = Math.min(bucketsAdvanced, BUCKET_COUNT)
        for (let i = 1; i <= toClear; i++) {
          state.counts[(state.currentBucket + i) % BUCKET_COUNT] = 0
        }
        state.currentBucket = (state.currentBucket + bucketsAdvanced) % BUCKET_COUNT
        state.bucketStartMs = now - (elapsed % BUCKET_DURATION_MS)
      }

      // 合計所有桶
      let total = 0
      for (let i = 0; i < BUCKET_COUNT; i++) {
        total += state.counts[i]!
      }

      if (total > 0) {
        // 吞吐量 = 總訊息 / 窗口秒數
        const windowSeconds = (BUCKET_COUNT * BUCKET_DURATION_MS) / 1000
        result[queue] = total / windowSeconds
      }
    }

    return result
  }
}
