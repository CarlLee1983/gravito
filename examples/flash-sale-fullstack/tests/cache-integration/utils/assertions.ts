/**
 * 自定義斷言
 * 用於集成測試的性能和業務邏輯驗證
 */

import { expect } from 'bun:test'

/**
 * 驗證延遲在指定範圍內
 */
export function assertLatency(actualMs: number, maxMs: number, label = '延遲'): void {
  expect(actualMs).toBeLessThanOrEqual(maxMs)
}

/**
 * 驗證命中率
 */
export function assertHitRate(
  hits: number,
  total: number,
  minRate: number,
  label = '命中率'
): void {
  const hitRate = total > 0 ? hits / total : 0
  expect(hitRate).toBeGreaterThanOrEqual(minRate)
}

/**
 * 驗證吞吐量
 */
export function assertThroughput(
  requests: number,
  durationSeconds: number,
  minQPS: number,
  label = '吞吐量'
): void {
  const qps = requests / Math.max(1, durationSeconds)
  expect(qps).toBeGreaterThanOrEqual(minQPS)
}

/**
 * 驗證百分位延遲
 */
export function assertPercentileLatency(
  latencies: number[],
  percentile: number,
  maxMs: number,
  label = ''
): void {
  if (latencies.length === 0) {
    throw new Error('沒有延遲數據')
  }

  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  const value = sorted[Math.max(0, index)]

  expect(value).toBeLessThanOrEqual(maxMs)
}

/**
 * 驗證記憶體增長
 */
export function assertMemoryGrowth(before: number, after: number, maxGrowthMB: number): void {
  const growthMB = (after - before) / (1024 * 1024)
  expect(growthMB).toBeLessThanOrEqual(maxGrowthMB)
}

/**
 * 驗證快取命中序列
 */
export function assertCacheHitPattern(
  accessSequence: string[],
  expectedHits: number,
  tolerance = 0.05
): void {
  // 假設前 10% 的訪問為 cold start
  const _warmupCount = Math.ceil(accessSequence.length * 0.1)

  // 在 warm start 後，大多數訪問應該是命中
  const expectedMin = Math.floor(expectedHits * (1 - tolerance))
  const expectedMax = Math.ceil(expectedHits * (1 + tolerance))

  expect(expectedHits).toBeGreaterThanOrEqual(expectedMin)
  expect(expectedHits).toBeLessThanOrEqual(expectedMax)
}

/**
 * 驗證數據一致性
 */
export function assertDataConsistency<T>(values: T[], expected: T, label = '數據一致性'): void {
  for (const value of values) {
    expect(JSON.stringify(value)).toBe(JSON.stringify(expected))
  }
}

/**
 * 驗證沒有資源洩漏
 */
export function assertNoResourceLeaks(
  initialConnections: number,
  finalConnections: number,
  tolerance = 0
): void {
  expect(finalConnections).toBeLessThanOrEqual(initialConnections + tolerance)
}

/**
 * 驗證錯誤率
 */
export function assertErrorRate(
  failures: number,
  total: number,
  maxRate: number,
  label = '錯誤率'
): void {
  const errorRate = total > 0 ? failures / total : 0
  expect(errorRate).toBeLessThanOrEqual(maxRate)
}

/**
 * 驗證緩存大小
 */
export function assertCacheSize(actualSize: number, maxSize: number, label = '快取大小'): void {
  expect(actualSize).toBeLessThanOrEqual(maxSize)
}

/**
 * 驗證響應時間分布
 */
export function assertLatencyDistribution(
  latencies: number[],
  expectedAvg: number,
  tolerance = 0.2 // 20% 容差
): void {
  const actual = latencies.reduce((a, b) => a + b, 0) / latencies.length
  const min = expectedAvg * (1 - tolerance)
  const max = expectedAvg * (1 + tolerance)

  expect(actual).toBeGreaterThanOrEqual(min)
  expect(actual).toBeLessThanOrEqual(max)
}

/**
 * 驗證批量操作的結果
 */
export function assertBatchResults<T>(
  results: T[],
  expectedCount: number,
  tolerance = 0.01 // 1% 容差
): void {
  const minExpected = Math.floor(expectedCount * (1 - tolerance))
  const maxExpected = Math.ceil(expectedCount * (1 + tolerance))

  expect(results.length).toBeGreaterThanOrEqual(minExpected)
  expect(results.length).toBeLessThanOrEqual(maxExpected)
}

/**
 * 驗證事件順序
 */
export function assertEventOrder<T>(events: T[], orderFn: (a: T, b: T) => number): void {
  for (let i = 0; i < events.length - 1; i++) {
    const comparison = orderFn(events[i], events[i + 1])
    expect(comparison).toBeLessThanOrEqual(0)
  }
}
