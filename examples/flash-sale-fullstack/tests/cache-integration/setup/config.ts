/**
 * 集成測試配置
 */

export const CACHE_CONFIG = {
  // L1 快取配置
  L1: {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxEntries: 10000,
    ttlSeconds: 300,
  },

  // 測試配置
  TEST: {
    // 基礎訪問測試
    basicAccessCount: 1000,
    basicConcurrency: 10,

    // 性能測試
    performanceTestDuration: 10000, // 10 秒
    performanceTargets: {
      hotspotLatencyP99: 0.1, // ms
      averageLatency: 2, // ms
      hitRate: 0.95,
      throughput: 10000, // QPS
    },

    // 並發測試
    maxConcurrency: 1000,
    stressTestDuration: 30000, // 30 秒

    // 預熱配置
    warmupThreshold: 100, // 訪問次數
    warmupBatchSize: 100,

    // 失效配置
    batchProcessingWindow: 200, // ms
    invalidationRetryCount: 3,

    // 時間相關
    shortDelay: 10,
    normalDelay: 100,
    longDelay: 1000,
  },

  // 生成的測試數據
  DATA: {
    productCount: 1000,
    hotProductRatio: 0.2, // 20% 的商品是熱銷商品
    accessPatternTotal: 10000,
    zipfParameter: 1.5,
  },
}

/**
 * 性能基準
 */
export const PERFORMANCE_BASELINE = {
  // 場景 A：預熱流程
  scenarioA: {
    maxLatency: 100, // ms
    minHitRate: 0.9,
  },

  // 場景 B：三層快取
  scenarioB: {
    l1HitLatency: 0.1, // ms (P99)
    l2HitLatency: 1, // ms (P99)
    l3HitLatency: 10, // ms (P99)
    minL1HitRate: 0.95,
    minL2HitRate: 0.85,
  },

  // 場景 C：事件驅逐
  scenarioC: {
    batchProcessingLatency: 300, // ms
    deduplicationSuccessRate: 0.99,
  },

  // 場景 D：端到端
  scenarioD: {
    completionTime: 5000, // ms
    cacheConsistency: 1.0, // 100%
  },

  // 場景 E：性能
  scenarioE: {
    p99Latency: 0.5, // ms
    p95Latency: 0.3, // ms
    minThroughput: 10000, // QPS
    minHitRate: 0.95,
    maxMemoryGrowth: 50, // MB
  },
}

/**
 * 獲取環境配置
 */
export function getEnvironmentConfig() {
  const isCI = process.env.CI === 'true'

  return {
    isCI,
    // CI 環境下使用更小的測試規模
    testScale: isCI ? 0.5 : 1.0,
    // CI 環境下稍微放寬性能要求
    performanceMultiplier: isCI ? 1.5 : 1.0,
  }
}

/**
 * 調整性能目標
 */
export function adjustPerformanceTargets() {
  const env = getEnvironmentConfig()
  const adjusted = { ...PERFORMANCE_BASELINE }

  if (env.isCI) {
    // 在 CI 環境中放寬標準
    Object.keys(adjusted).forEach((scenario) => {
      const config = (adjusted as any)[scenario]
      Object.keys(config).forEach((key) => {
        if (typeof config[key] === 'number' && key.includes('Latency')) {
          config[key] *= env.performanceMultiplier
        }
      })
    })
  }

  return adjusted
}
