/**
 * P1.3 Phase 2 - Parameter Tuner
 *
 * 參數調優工具類，用於優化事件驅動系統性能
 */

export interface TuningScenario {
  name: string
  description: string
  eventRate: number // 事件/秒
  avgBatchSize: number
  priorityDistribution: {
    critical: number // %
    high: number // %
    normal: number // %
    low: number // %
  }
}

export interface OptimizedParameters {
  eventAggregator: {
    maxQueueDepth: number
    backgroundFlushIntervalMs: number
    deduplicationEnabled: boolean
    aggregationWindowMs: Record<string, number>
  }
  invalidationScheduler: {
    maxConcurrentTasks: number
    taskTimeoutMs: number
  }
  retryPolicy: {
    maxRetries: number
    initialDelayMs: number
    maxDelayMs: number
    backoffMultiplier: number
  }
}

export class ParameterTuner {
  /**
   * 根據場景推薦最優參數
   */
  static recommendParameters(scenario: TuningScenario): OptimizedParameters {
    const eventRateKps = scenario.eventRate / 1000 // 轉換為 K ops/sec

    // 計算隊列深度：支持 2 倍峰值負載
    const maxQueueDepth = Math.ceil(eventRateKps * 2 * 2)

    // 計算 flush 間隔：根據批大小和事件率
    const backgroundFlushIntervalMs = Math.max(
      100,
      Math.min(1000, Math.ceil((scenario.avgBatchSize * 1000) / scenario.eventRate))
    )

    // 計算聚合窗口：根據優先級
    const aggregationWindowMs = {
      CRITICAL: 10, // 立即處理
      HIGH: 50,
      NORMAL: 200,
      LOW: 500,
    }

    // 計算併發任務數：根據 CPU 核心數
    const cpuCores = typeof navigator === 'undefined' ? 4 : 2
    const maxConcurrentTasks = Math.ceil(eventRateKps / 100) * cpuCores

    // 根據優先級分布調整重試策略
    const criticalRatio = scenario.priorityDistribution.critical / 100
    const maxRetries = criticalRatio > 0.5 ? 5 : 3

    return {
      eventAggregator: {
        maxQueueDepth,
        backgroundFlushIntervalMs,
        deduplicationEnabled: true,
        aggregationWindowMs,
      },
      invalidationScheduler: {
        maxConcurrentTasks,
        taskTimeoutMs: 30000,
      },
      retryPolicy: {
        maxRetries,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      },
    }
  }

  /**
   * 低延遲場景優化（< 1ms P99）
   */
  static lowLatencyTuning(): OptimizedParameters {
    return {
      eventAggregator: {
        maxQueueDepth: 10000,
        backgroundFlushIntervalMs: 10,
        deduplicationEnabled: true,
        aggregationWindowMs: {
          CRITICAL: 1,
          HIGH: 10,
          NORMAL: 50,
          LOW: 100,
        },
      },
      invalidationScheduler: {
        maxConcurrentTasks: 16,
        taskTimeoutMs: 1000,
      },
      retryPolicy: {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 1.5,
      },
    }
  }

  /**
   * 高吞吐量場景優化（> 10K QPS）
   */
  static highThroughputTuning(): OptimizedParameters {
    return {
      eventAggregator: {
        maxQueueDepth: 50000,
        backgroundFlushIntervalMs: 500,
        deduplicationEnabled: true,
        aggregationWindowMs: {
          CRITICAL: 50,
          HIGH: 100,
          NORMAL: 500,
          LOW: 1000,
        },
      },
      invalidationScheduler: {
        maxConcurrentTasks: 32,
        taskTimeoutMs: 60000,
      },
      retryPolicy: {
        maxRetries: 5,
        initialDelayMs: 100,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      },
    }
  }

  /**
   * 低記憶體場景優化
   */
  static lowMemoryTuning(): OptimizedParameters {
    return {
      eventAggregator: {
        maxQueueDepth: 1000,
        backgroundFlushIntervalMs: 100,
        deduplicationEnabled: true,
        aggregationWindowMs: {
          CRITICAL: 10,
          HIGH: 50,
          NORMAL: 200,
          LOW: 500,
        },
      },
      invalidationScheduler: {
        maxConcurrentTasks: 4,
        taskTimeoutMs: 10000,
      },
      retryPolicy: {
        maxRetries: 2,
        initialDelayMs: 50,
        maxDelayMs: 5000,
        backoffMultiplier: 1.5,
      },
    }
  }

  /**
   * 可靠性優先場景優化
   */
  static reliabilityFirstTuning(): OptimizedParameters {
    return {
      eventAggregator: {
        maxQueueDepth: 20000,
        backgroundFlushIntervalMs: 500,
        deduplicationEnabled: true,
        aggregationWindowMs: {
          CRITICAL: 100,
          HIGH: 200,
          NORMAL: 1000,
          LOW: 2000,
        },
      },
      invalidationScheduler: {
        maxConcurrentTasks: 8,
        taskTimeoutMs: 120000,
      },
      retryPolicy: {
        maxRetries: 10,
        initialDelayMs: 200,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
      },
    }
  }
}

/**
 * 性能調優場景定義
 */
export const TUNING_SCENARIOS: Record<string, TuningScenario> = {
  // 秒殺活動：高峰期 10K+ QPS
  flashSale: {
    name: 'Flash Sale',
    description: '秒殺活動：短時間內高併發',
    eventRate: 10000,
    avgBatchSize: 50,
    priorityDistribution: {
      critical: 30,
      high: 40,
      normal: 25,
      low: 5,
    },
  },

  // 日常運營：中等負載
  normalOperation: {
    name: 'Normal Operation',
    description: '日常運營：中等負載',
    eventRate: 1000,
    avgBatchSize: 20,
    priorityDistribution: {
      critical: 10,
      high: 30,
      normal: 50,
      low: 10,
    },
  },

  // 夜間維護：低負載
  lowLoad: {
    name: 'Low Load',
    description: '夜間維護：低負載',
    eventRate: 100,
    avgBatchSize: 10,
    priorityDistribution: {
      critical: 5,
      high: 15,
      normal: 60,
      low: 20,
    },
  },

  // 邊界情況：極端負載
  extremeLoad: {
    name: 'Extreme Load',
    description: '極端負載：測試系統極限',
    eventRate: 50000,
    avgBatchSize: 100,
    priorityDistribution: {
      critical: 50,
      high: 30,
      normal: 15,
      low: 5,
    },
  },
}
