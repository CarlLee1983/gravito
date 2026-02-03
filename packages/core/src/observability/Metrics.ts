/**
 * @gravito/core - Prometheus Metrics Setup
 *
 * 設置和導出 Prometheus 指標，用於性能監控。
 */

/**
 * Prometheus 指標配置
 */
export interface PrometheusMetricsConfig {
  /** Prometheus 抓取端口 */
  port?: number
  /** 指標前綴 */
  prefix?: string
  /** 上報間隔（毫秒） */
  interval?: number
  /** 是否啟用默認指標（如內存、CPU） */
  defaultMetrics?: boolean
}

const DEFAULTS = {
  port: 9090,
  prefix: 'gravito_event_',
  interval: 60000, // 60 秒
  defaultMetrics: true,
}

/**
 * Prometheus 指標導出器
 *
 * 將 Gravito 事件系統的指標導出到 Prometheus
 *
 * @example
 * ```typescript
 * import { setupPrometheusMetrics } from '@gravito/core/observability'
 *
 * const exporter = await setupPrometheusMetrics({
 *   port: 9090,
 *   prefix: 'gravito_event_'
 * })
 * ```
 *
 * @public
 */
export async function setupPrometheusMetrics(
  config: PrometheusMetricsConfig = {}
): Promise<{ port: number; endpoint: string } | null> {
  const finalConfig = {
    port: config.port ?? parseInt(process.env.PROMETHEUS_PORT || String(DEFAULTS.port)),
    prefix: config.prefix ?? process.env.PROMETHEUS_PREFIX ?? DEFAULTS.prefix,
    interval:
      config.interval ?? parseInt(process.env.PROMETHEUS_INTERVAL || String(DEFAULTS.interval)),
    defaultMetrics: config.defaultMetrics ?? process.env.PROMETHEUS_DEFAULT_METRICS !== 'false',
  }

  try {
    // 動態導入 OpenTelemetry Prometheus 導出器
    const { metrics } = await import('@opentelemetry/api')
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { MeterProvider } = await import('@opentelemetry/sdk-metrics')
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus')

    // 創建 Prometheus 導出器
    const exporter = new (PrometheusExporter as any)(
      {
        port: finalConfig.port,
        endpoint: '/metrics',
      },
      () => {
        console.log(
          `[Metrics] Prometheus metrics available at http://localhost:${finalConfig.port}/metrics`
        )
      }
    )

    // 創建 Meter Provider
    const meterProvider = new (MeterProvider as any)({
      exporter,
      interval: finalConfig.interval,
    })

    // 設置全局 Meter Provider
    metrics.setGlobalMeterProvider(meterProvider)

    // 導出默認指標（如內存使用）
    if (finalConfig.defaultMetrics) {
      try {
        // @ts-expect-error - OpenTelemetry 模塊是可選的
        const { collectDefaultMetrics } = await import('@opentelemetry/auto-instrumentations-node')
        collectDefaultMetrics({ meterProvider, prefix: finalConfig.prefix })
      } catch (error) {
        console.warn('[Metrics] Failed to setup default metrics:', error)
      }
    }

    return {
      port: finalConfig.port,
      endpoint: `/metrics`,
    }
  } catch (error) {
    console.warn('[Metrics] Failed to setup Prometheus exporter:', error)
    console.log('[Metrics] Metrics will not be exported to Prometheus')
    return null
  }
}

/**
 * 事件系統指標定義
 *
 * 這些指標用於監控事件派發系統的性能和可靠性。
 *
 * @public
 */
export interface EventMetricsDefinition {
  /** 事件派發延遲（直方圖） */
  dispatchLatency: {
    name: string
    help: string
    labels: string[]
    buckets: number[]
  }

  /** 監聽器執行時間（直方圖） */
  listenerExecutionTime: {
    name: string
    help: string
    labels: string[]
    buckets: number[]
  }

  /** 隊列深度（量表） */
  queueDepth: {
    name: string
    help: string
    labels: string[]
  }

  /** 失敗計數（計數器） */
  failureRate: {
    name: string
    help: string
    labels: string[]
  }

  /** 超時計數（計數器） */
  timeoutCount: {
    name: string
    help: string
    labels: string[]
  }

  /** 吞吐量（計數器） */
  throughput: {
    name: string
    help: string
    labels: string[]
  }

  /** 熔斷器狀態（量表） */
  circuitBreakerState: {
    name: string
    help: string
    labels: string[]
  }

  /** 熔斷器狀態轉換（計數器） */
  circuitBreakerTransitions: {
    name: string
    help: string
    labels: string[]
  }

  /** 熔斷器失敗計數（計數器） */
  circuitBreakerFailures: {
    name: string
    help: string
    labels: string[]
  }

  /** 熔斷器成功計數（計數器） */
  circuitBreakerSuccesses: {
    name: string
    help: string
    labels: string[]
  }

  /** 熔斷器 OPEN 持續時間（直方圖） */
  circuitBreakerOpenDuration: {
    name: string
    help: string
    labels: string[]
    buckets: number[]
  }
}

/**
 * 獲取事件系統的標準指標定義
 *
 * @param prefix - 指標名稱前綴（默認：gravito_event_）
 * @returns 指標定義對象
 *
 * @example
 * ```typescript
 * import { getEventMetricsDefinition } from '@gravito/core/observability'
 *
 * const metrics = getEventMetricsDefinition('gravito_event_')
 * console.log(metrics.dispatchLatency.name)  // gravito_event_dispatch_latency_seconds
 * ```
 *
 * @public
 */
export function getEventMetricsDefinition(prefix = DEFAULTS.prefix): EventMetricsDefinition {
  return {
    dispatchLatency: {
      name: `${prefix}dispatch_latency_seconds`,
      help: 'Event dispatch latency distribution',
      labels: ['event_name', 'priority'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    },

    listenerExecutionTime: {
      name: `${prefix}listener_execution_seconds`,
      help: 'Individual listener execution time',
      labels: ['event_name', 'listener_name'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    },

    queueDepth: {
      name: `${prefix}queue_depth`,
      help: 'Current queue depth by priority',
      labels: ['priority'],
    },

    failureRate: {
      name: `${prefix}failures_total`,
      help: 'Total event processing failures',
      labels: ['event_name', 'error_type'],
    },

    timeoutCount: {
      name: `${prefix}timeouts_total`,
      help: 'Total event timeouts',
      labels: ['event_name'],
    },

    throughput: {
      name: `${prefix}throughput_total`,
      help: 'Total events processed',
      labels: ['event_name', 'status'],
    },

    circuitBreakerState: {
      name: `${prefix}circuit_breaker_state`,
      help: 'Current circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      labels: ['event_name'],
    },

    circuitBreakerTransitions: {
      name: `${prefix}circuit_breaker_transitions_total`,
      help: 'Total number of circuit breaker state transitions',
      labels: ['event_name', 'from_state', 'to_state'],
    },

    circuitBreakerFailures: {
      name: `${prefix}circuit_breaker_failures_total`,
      help: 'Total number of failures tracked by circuit breaker',
      labels: ['event_name'],
    },

    circuitBreakerSuccesses: {
      name: `${prefix}circuit_breaker_successes_total`,
      help: 'Total number of successes tracked by circuit breaker',
      labels: ['event_name'],
    },

    circuitBreakerOpenDuration: {
      name: `${prefix}circuit_breaker_open_duration_seconds`,
      help: 'Duration of circuit breaker OPEN state in seconds',
      labels: ['event_name'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    },
  }
}

/**
 * Prometheus 查詢範例
 *
 * 提供常用的 Prometheus 查詢語句，用於監控事件系統
 *
 * @public
 */
export const PROMETHEUS_QUERIES = {
  /** 事件派發延遲 P95 */
  dispatchLatencyP95:
    'histogram_quantile(0.95, rate(gravito_event_dispatch_latency_seconds_bucket[5m]))',

  /** 事件派發延遲 P99 */
  dispatchLatencyP99:
    'histogram_quantile(0.99, rate(gravito_event_dispatch_latency_seconds_bucket[5m]))',

  /** 隊列深度（按優先級） */
  queueDepthByPriority: 'gravito_event_queue_depth',

  /** 吞吐量（事件/秒） */
  throughput: 'rate(gravito_event_throughput_total[1m])',

  /** 失敗率 */
  failureRate: 'rate(gravito_event_failures_total[5m]) / rate(gravito_event_throughput_total[5m])',

  /** 監聽器執行時間 P99 */
  listenerLatencyP99:
    'histogram_quantile(0.99, rate(gravito_event_listener_execution_seconds_bucket[5m]))',

  /** 超時次數 */
  timeoutCount: 'rate(gravito_event_timeouts_total[5m])',

  /** 吞吐量異常檢測 */
  throughputAnomaly: 'rate(gravito_event_throughput_total[5m]) < 100',

  /** 熔斷器狀態（0=CLOSED, 1=HALF_OPEN, 2=OPEN） */
  circuitBreakerState: 'gravito_event_circuit_breaker_state',

  /** 熔斷器開啟率 */
  circuitBreakerOpenRate:
    'rate(gravito_event_circuit_breaker_transitions_total{to_state="OPEN"}[5m])',

  /** 熔斷器恢復率 */
  circuitBreakerRecoveryRate:
    'rate(gravito_event_circuit_breaker_transitions_total{to_state="CLOSED"}[5m])',

  /** 熔斷器失敗率 */
  circuitBreakerFailureRate: 'rate(gravito_event_circuit_breaker_failures_total[5m])',

  /** 熔斷器 OPEN 持續時間 P95 */
  circuitBreakerOpenDurationP95:
    'histogram_quantile(0.95, rate(gravito_event_circuit_breaker_open_duration_seconds_bucket[5m]))',

  /** 熔斷器 OPEN 持續時間 P99 */
  circuitBreakerOpenDurationP99:
    'histogram_quantile(0.99, rate(gravito_event_circuit_breaker_open_duration_seconds_bucket[5m]))',
}

/**
 * Prometheus 告警規則
 *
 * 提供預定義的告警規則，用於監控事件系統的健康狀況
 *
 * @public
 */
export const PROMETHEUS_ALERT_RULES = {
  /** P99 延遲過高 */
  HighDispatchLatency: {
    expr: 'histogram_quantile(0.99, gravito_event_dispatch_latency_seconds) > 0.8',
    for: '5m',
    severity: 'critical',
    summary: '事件派發 P99 延遲過高',
    description: 'P99 延遲: {{ $value }}s，已超過 800ms',
  },

  /** 隊列深度過高 */
  HighQueueDepth: {
    expr: 'gravito_event_queue_depth{priority="high"} > 1000',
    for: '2m',
    severity: 'warning',
    summary: '高優先級事件隊列堆積',
    description: '隊列深度: {{ $value }}，應調查原因',
  },

  /** 失敗率過高 */
  HighFailureRate: {
    expr: '(rate(gravito_event_failures_total[5m]) / rate(gravito_event_throughput_total[5m])) > 0.05',
    for: '3m',
    severity: 'critical',
    summary: '事件處理失敗率過高',
    description: '失敗率: {{ $value | humanizePercentage }}，超過 5%',
  },

  /** 監聽器執行時間過長 */
  SlowListener: {
    expr: 'histogram_quantile(0.99, gravito_event_listener_execution_seconds) > 1.0',
    for: '5m',
    severity: 'warning',
    summary: '監聽器執行時間過長',
    description: 'P99 耗時: {{ $value }}s，監聽器: {{ $labels.listener_name }}',
  },

  /** 吞吐量異常下降 */
  ThroughputDrop: {
    expr: 'rate(gravito_event_throughput_total[5m]) < 100 and increase(gravito_event_throughput_total[1h]) > 0',
    for: '2m',
    severity: 'critical',
    summary: '事件吞吐量異常下降',
    description: '當前吞吐: {{ $value | humanize }} events/sec',
  },

  /** 熔斷器持續開啟 */
  CircuitBreakerOpen: {
    expr: 'gravito_event_circuit_breaker_state{event_name=~".+"} == 2',
    for: '5m',
    severity: 'warning',
    summary: '熔斷器持續開啟',
    description: '事件 {{ $labels.event_name }} 熔斷器已開啟超過 5 分鐘',
  },

  /** 熔斷器頻繁切換 */
  CircuitBreakerFlapping: {
    expr: 'rate(gravito_event_circuit_breaker_transitions_total[5m]) > 10',
    for: '2m',
    severity: 'critical',
    summary: '熔斷器頻繁切換',
    description: '事件 {{ $labels.event_name }} 熔斷器狀態切換過於頻繁，切換速率: {{ $value }}/sec',
  },

  /** 熔斷器故障率過高 */
  CircuitBreakerHighFailureRate: {
    expr: 'rate(gravito_event_circuit_breaker_failures_total[5m]) > rate(gravito_event_circuit_breaker_successes_total[5m])',
    for: '3m',
    severity: 'critical',
    summary: '熔斷器故障率超過成功率',
    description: '事件 {{ $labels.event_name }} 的失敗率已超過成功率',
  },
}
