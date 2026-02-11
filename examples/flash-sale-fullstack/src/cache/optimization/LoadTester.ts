/**
 * P1.3 Phase 2 - Load Testing Utilities
 *
 * 負載測試工具，支持多種測試模式
 */

export interface LoadTestResult {
  name: string
  duration: number // 毫秒
  totalOperations: number
  successCount: number
  failureCount: number
  throughput: number // ops/sec
  avgLatency: number // 毫秒
  minLatency: number
  maxLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  memoryUsed: number // MB
}

export class LoadTester {
  private baselineMemory = 0

  /**
   * 恆定負載測試
   * 以固定 QPS 運行指定時間
   */
  async constantLoad(
    fn: () => Promise<void>,
    durationMs: number,
    qps: number
  ): Promise<LoadTestResult> {
    return this._runLoadTest(fn, this._constantLoadGenerator(qps), durationMs, 'Constant Load')
  }

  /**
   * 漸進式負載測試
   * 從低 QPS 逐步增加到目標 QPS
   */
  async rampUpLoad(
    fn: () => Promise<void>,
    durationMs: number,
    startQps: number,
    endQps: number
  ): Promise<LoadTestResult> {
    return this._runLoadTest(
      fn,
      this._rampUpLoadGenerator(durationMs, startQps, endQps),
      durationMs,
      `Ramp Up (${startQps}-${endQps} QPS)`
    )
  }

  /**
   * 波動負載測試
   * 模擬流量波動
   */
  async burstLoad(
    fn: () => Promise<void>,
    durationMs: number,
    baseQps: number,
    peakQps: number,
    burstIntervalMs: number
  ): Promise<LoadTestResult> {
    return this._runLoadTest(
      fn,
      this._burstLoadGenerator(baseQps, peakQps, burstIntervalMs),
      durationMs,
      `Burst Load (${baseQps}-${peakQps} QPS)`
    )
  }

  /**
   * 壓力測試
   * 持續增加負載直到系統失敗或達到目標
   */
  async stressTest(
    fn: () => Promise<void>,
    maxDurationMs: number,
    startQps: number,
    increaseQpsEvery: number
  ): Promise<LoadTestResult> {
    let currentQps = startQps
    let totalOperations = 0
    let failureCount = 0
    const startTime = Date.now()
    const latencies: number[] = []

    const targetFailureRate = 0.05 // 5% 失敗率作為極限

    while (Date.now() - startTime < maxDurationMs) {
      const batchStart = Date.now()

      try {
        // 在當前 QPS 下運行一批操作
        const batchSize = Math.ceil(currentQps / 10) // 100ms 批次
        const operationTimes: number[] = []

        for (let i = 0; i < batchSize; i++) {
          const opStart = performance.now()
          try {
            await fn()
            operationTimes.push(performance.now() - opStart)
            totalOperations++
          } catch {
            failureCount++
          }
        }

        latencies.push(...operationTimes)

        // 檢查是否達到失敗率閾值
        const failureRate = failureCount / totalOperations
        if (failureRate > targetFailureRate) {
          break
        }

        // 每隔指定時間增加 QPS
        if (Date.now() - batchStart > increaseQpsEvery) {
          currentQps = Math.ceil(currentQps * 1.2) // 增加 20%
        }
      } catch (_error) {
        failureCount++
      }
    }

    const duration = Date.now() - startTime

    return this._calculateResults('Stress Test', duration, totalOperations, failureCount, latencies)
  }

  /**
   * 冷啟動測試
   * 測量應用啟動時系統性能的恢復
   */
  async coldStartTest(
    fn: () => Promise<void>,
    warmupDurationMs: number,
    testDurationMs: number,
    qps: number
  ): Promise<{ warmup: LoadTestResult; test: LoadTestResult }> {
    // 熱身階段
    const warmup = await this.constantLoad(fn, warmupDurationMs, qps / 2)

    // 實際測試
    const test = await this.constantLoad(fn, testDurationMs, qps)

    return { warmup, test }
  }

  /**
   * 內部：運行負載測試
   */
  private async _runLoadTest(
    fn: () => Promise<void>,
    loadGenerator: AsyncGenerator<number>,
    maxDurationMs: number,
    name: string
  ): Promise<LoadTestResult> {
    this.baselineMemory =
      typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage().heapUsed : 0

    const startTime = Date.now()
    let totalOperations = 0
    let failureCount = 0
    const latencies: number[] = []

    for await (const waitTimeMs of loadGenerator) {
      if (Date.now() - startTime > maxDurationMs) break

      const opStart = performance.now()
      try {
        await fn()
      } catch {
        failureCount++
      } finally {
        totalOperations++
        latencies.push(performance.now() - opStart)
      }

      // 根據目標 QPS 等待
      if (waitTimeMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTimeMs))
      }
    }

    const duration = Date.now() - startTime

    return this._calculateResults(name, duration, totalOperations, failureCount, latencies)
  }

  /**
   * 計算測試結果
   */
  private _calculateResults(
    name: string,
    duration: number,
    totalOperations: number,
    failureCount: number,
    latencies: number[]
  ): LoadTestResult {
    const successCount = totalOperations - failureCount
    const durationSec = duration / 1000
    const throughput = totalOperations / durationSec

    const sorted = [...latencies].sort((a, b) => a - b)
    const memoryUsed =
      typeof process !== 'undefined' && process.memoryUsage
        ? (process.memoryUsage().heapUsed - this.baselineMemory) / 1024 / 1024
        : 0

    return {
      name,
      duration,
      totalOperations,
      successCount,
      failureCount,
      throughput,
      avgLatency:
        latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: sorted[Math.floor(sorted.length * 0.5)],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
      memoryUsed,
    }
  }

  /**
   * 恆定負載生成器
   */
  private async *_constantLoadGenerator(qps: number) {
    const intervalMs = 1000 / qps

    while (true) {
      yield intervalMs
    }
  }

  /**
   * 漸進式負載生成器
   */
  private async *_rampUpLoadGenerator(durationMs: number, startQps: number, endQps: number) {
    const startTime = Date.now()

    while (true) {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / durationMs)

      // 線性增加 QPS
      const currentQps = startQps + (endQps - startQps) * progress

      yield 1000 / currentQps
    }
  }

  /**
   * 波動負載生成器
   */
  private async *_burstLoadGenerator(baseQps: number, peakQps: number, burstIntervalMs: number) {
    let burstActive = false
    let burstStart = Date.now()

    while (true) {
      const now = Date.now()
      const timeSinceBurst = now - burstStart

      // 在 burst 開始和結束之間切換
      if (timeSinceBurst > burstIntervalMs) {
        burstActive = !burstActive
        burstStart = now
      }

      const currentQps = burstActive ? peakQps : baseQps

      yield 1000 / currentQps
    }
  }
}

/**
 * 負載測試結果分析工具
 */
export class LoadTestAnalyzer {
  /**
   * 比較多個測試結果
   */
  static compare(results: LoadTestResult[]): void {
    console.log('\n📊 Load Test Comparison:')
    console.log('─'.repeat(120))

    const header = [
      'Test Name'.padEnd(25),
      'Throughput'.padEnd(15),
      'Avg Latency'.padEnd(15),
      'P99 Latency'.padEnd(15),
      'Success Rate'.padEnd(15),
      'Memory (MB)'.padEnd(15),
    ]

    console.log(header.join(''))
    console.log('─'.repeat(120))

    results.forEach((result) => {
      const successRate = ((result.successCount / result.totalOperations) * 100).toFixed(1)

      const row = [
        result.name.padEnd(25),
        `${result.throughput.toFixed(0)} ops/s`.padEnd(15),
        `${result.avgLatency.toFixed(3)}ms`.padEnd(15),
        `${result.p99Latency.toFixed(3)}ms`.padEnd(15),
        `${successRate}%`.padEnd(15),
        `${result.memoryUsed.toFixed(1)}MB`.padEnd(15),
      ]

      console.log(row.join(''))
    })

    console.log('─'.repeat(120))
  }

  /**
   * 生成性能報告
   */
  static generateReport(results: LoadTestResult[]): string {
    let report = '# Load Test Report\n\n'

    results.forEach((result) => {
      report += `## ${result.name}\n\n`
      report += `- **Duration**: ${(result.duration / 1000).toFixed(2)}s\n`
      report += `- **Total Operations**: ${result.totalOperations}\n`
      report += `- **Success Rate**: ${((result.successCount / result.totalOperations) * 100).toFixed(1)}%\n`
      report += `- **Throughput**: ${result.throughput.toFixed(0)} ops/sec\n`
      report += `- **Latency**:\n`
      report += `  - Average: ${result.avgLatency.toFixed(3)}ms\n`
      report += `  - P50: ${result.p50Latency.toFixed(3)}ms\n`
      report += `  - P95: ${result.p95Latency.toFixed(3)}ms\n`
      report += `  - P99: ${result.p99Latency.toFixed(3)}ms\n`
      report += `  - Max: ${result.maxLatency.toFixed(3)}ms\n`
      report += `- **Memory**: ${result.memoryUsed.toFixed(2)}MB\n\n`
    })

    return report
  }
}
