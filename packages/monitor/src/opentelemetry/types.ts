/**
 * @gravito/core - OpenTelemetry 類型定義
 *
 * 定義 OpenTelemetry SDK 集成所需的類型與介面。
 */

/**
 * Tracing（追蹤）導出器類型
 */
export type TracingExporter = 'jaeger' | 'otlp' | 'console' | 'none'

/**
 * Metrics（指標）導出器類型
 */
export type MetricsExporter = 'prometheus' | 'otlp' | 'console' | 'none'

/**
 * Tracing 配置選項
 */
export interface TracingConfig {
  /** 是否啟用追蹤（預設：true） */
  enabled?: boolean
  /** 導出器類型（預設：otlp） */
  exporter?: TracingExporter
  /** Jaeger HTTP 端點（使用 jaeger 導出器時） */
  jaegerEndpoint?: string
  /** OTLP 端點（使用 otlp 導出器時） */
  otlpEndpoint?: string
  /** 採樣率（0-1，預設：1.0 = 100%） */
  samplingRate?: number
  /** 是否啟用自動儀器化（預設：false） */
  autoInstrumentation?: boolean
  /** Batch Span Processor 配置 */
  batchConfig?: {
    /** 最大批次大小（預設：512） */
    maxExportBatchSize?: number
    /** 導出間隔（毫秒，預設：5000） */
    scheduledDelayMillis?: number
    /** 導出超時（毫秒，預設：30000） */
    exportTimeoutMillis?: number
    /** 最大隊列大小（預設：2048） */
    maxQueueSize?: number
  }
}

/**
 * Metrics 配置選項
 */
export interface MetricsConfig {
  /** 是否啟用指標（預設：true） */
  enabled?: boolean
  /** 導出器類型（預設：otlp） */
  exporter?: MetricsExporter
  /** Prometheus 端口（使用 prometheus 導出器時，預設：9090） */
  prometheusPort?: number
  /** Prometheus 端點路徑（預設：/metrics） */
  prometheusEndpoint?: string
  /** OTLP 端點（使用 otlp 導出器時） */
  otlpEndpoint?: string
  /** 導出間隔（毫秒，預設：60000） */
  exportIntervalMillis?: number
}

/**
 * OpenTelemetry SDK 完整配置
 */
export interface OpenTelemetryConfig {
  /** 是否啟用 OpenTelemetry（預設：true） */
  enabled?: boolean
  /** 服務名稱（預設：gravito-app） */
  serviceName?: string
  /** 服務版本（預設：1.0.0） */
  serviceVersion?: string
  /** 環境名稱（預設：development） */
  environment?: 'development' | 'staging' | 'production' | string
  /** 自定義 Resource Attributes */
  resourceAttributes?: Record<string, string | number | boolean>
  /** Tracing 配置 */
  tracing?: TracingConfig
  /** Metrics 配置 */
  metrics?: MetricsConfig
  /** 是否在控制台輸出初始化日誌（預設：true） */
  logInitialization?: boolean
}

/**
 * OpenTelemetry SDK 實例包裝
 *
 * 封裝初始化後的 SDK 實例與相關資源。
 */
export interface OpenTelemetrySDK {
  /** SDK 是否已啟動 */
  isStarted: boolean
  /** SDK 是否已關閉 */
  isShutdown: boolean
  /** 服務名稱 */
  serviceName: string
  /** 服務版本 */
  serviceVersion: string
  /** Tracer Provider（如果啟用追蹤） */
  tracerProvider: unknown | null
  /** Meter Provider（如果啟用指標） */
  meterProvider: unknown | null
  /** 原始配置 */
  config: OpenTelemetryConfig
  /** 關閉 SDK */
  shutdown: () => Promise<void>
}

/**
 * 支援的 OpenTelemetry 環境變數
 *
 * 參考：https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
 */
export const OTEL_ENV_VARS = {
  // 通用配置
  /** 服務名稱 */
  SERVICE_NAME: 'OTEL_SERVICE_NAME',
  /** 服務版本 */
  SERVICE_VERSION: 'OTEL_SERVICE_VERSION',
  /** 環境名稱 */
  DEPLOYMENT_ENVIRONMENT: 'OTEL_DEPLOYMENT_ENVIRONMENT',
  /** Resource Attributes */
  RESOURCE_ATTRIBUTES: 'OTEL_RESOURCE_ATTRIBUTES',

  // OTLP 導出器
  /** OTLP 端點（通用） */
  OTLP_ENDPOINT: 'OTEL_EXPORTER_OTLP_ENDPOINT',
  /** OTLP Traces 端點 */
  OTLP_TRACES_ENDPOINT: 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  /** OTLP Metrics 端點 */
  OTLP_METRICS_ENDPOINT: 'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',

  // 採樣器
  /** 採樣器類型 */
  TRACES_SAMPLER: 'OTEL_TRACES_SAMPLER',
  /** 採樣率參數 */
  TRACES_SAMPLER_ARG: 'OTEL_TRACES_SAMPLER_ARG',

  // Gravito 自定義
  /** 是否啟用 OpenTelemetry */
  GRAVITO_ENABLED: 'GRAVITO_OTEL_ENABLED',
  /** Jaeger 端點 */
  JAEGER_ENDPOINT: 'JAEGER_ENDPOINT',
  /** Prometheus 端口 */
  PROMETHEUS_PORT: 'PROMETHEUS_PORT',
} as const

/**
 * 完整的 BatchConfig 類型（所有屬性必填）
 */
export interface BatchConfigRequired {
  maxExportBatchSize: number
  scheduledDelayMillis: number
  exportTimeoutMillis: number
  maxQueueSize: number
}

/**
 * 完整的 TracingConfig 類型（所有屬性必填）
 */
export interface TracingConfigRequired {
  enabled: boolean
  exporter: TracingExporter
  jaegerEndpoint: string
  otlpEndpoint: string
  samplingRate: number
  autoInstrumentation: boolean
  batchConfig: BatchConfigRequired
}

/**
 * 完整的 MetricsConfig 類型（所有屬性必填）
 */
export interface MetricsConfigRequired {
  enabled: boolean
  exporter: MetricsExporter
  prometheusPort: number
  prometheusEndpoint: string
  otlpEndpoint: string
  exportIntervalMillis: number
}

/**
 * 完整的 OpenTelemetryConfig 類型（所有屬性必填）
 */
export interface OpenTelemetryConfigRequired {
  enabled: boolean
  serviceName: string
  serviceVersion: string
  environment: 'development' | 'staging' | 'production'
  resourceAttributes: Record<string, string | number | boolean>
  tracing: TracingConfigRequired
  metrics: MetricsConfigRequired
  logInitialization: boolean
}

/**
 * 預設配置值
 */
export const DEFAULT_CONFIG: OpenTelemetryConfigRequired = {
  enabled: true,
  serviceName: 'gravito-app',
  serviceVersion: '1.0.0',
  environment: 'development',
  resourceAttributes: {},
  logInitialization: true,
  tracing: {
    enabled: true,
    exporter: 'otlp',
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    otlpEndpoint: 'http://localhost:4318',
    samplingRate: 1.0,
    autoInstrumentation: false,
    batchConfig: {
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
      maxQueueSize: 2048,
    },
  },
  metrics: {
    enabled: true,
    exporter: 'otlp',
    prometheusPort: 9090,
    prometheusEndpoint: '/metrics',
    otlpEndpoint: 'http://localhost:4318',
    exportIntervalMillis: 60000,
  },
}
