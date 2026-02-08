/**
 * @gravito/core - OpenTelemetry SDK 集成
 *
 * 提供 OpenTelemetry 的初始化、配置與管理功能。
 * 支援動態導入以實現可選依賴的優雅降級。
 *
 * @example
 * ```typescript
 * import { setupOpenTelemetry } from '@gravito/core'
 *
 * const sdk = await setupOpenTelemetry({
 *   serviceName: 'my-service',
 *   serviceVersion: '1.0.0',
 *   tracing: {
 *     enabled: true,
 *     exporter: 'jaeger',
 *     samplingRate: 0.1
 *   },
 *   metrics: {
 *     enabled: true,
 *     exporter: 'prometheus',
 *     prometheusPort: 9090
 *   }
 * })
 * ```
 *
 * @packageDocumentation
 */

import {
  DEFAULT_CONFIG,
  type MetricsConfig,
  type MetricsConfigRequired,
  type OpenTelemetryConfig,
  type OpenTelemetryConfigRequired,
  type OpenTelemetrySDK,
  OTEL_ENV_VARS,
  type TracingConfig,
  type TracingConfigRequired,
} from './types'

// 重新導出類型
export type { MetricsConfig, OpenTelemetryConfig, OpenTelemetrySDK, TracingConfig }

/**
 * 全局 SDK 實例
 */
let globalSDK: OpenTelemetrySDK | null = null

/**
 * 初始化狀態
 */
let isInitialized = false

/**
 * 從環境變數獲取配置
 *
 * @returns 從環境變數解析的部分配置
 */
function getConfigFromEnv(): Partial<OpenTelemetryConfig> {
  const env = process.env

  // 解析 OTEL_RESOURCE_ATTRIBUTES (格式: key=value,key2=value2)
  const resourceAttrs: Record<string, string> = {}
  const resourceAttrsStr = env[OTEL_ENV_VARS.RESOURCE_ATTRIBUTES]
  if (resourceAttrsStr) {
    for (const pair of resourceAttrsStr.split(',')) {
      const [key, value] = pair.split('=')
      if (key && value) {
        resourceAttrs[key.trim()] = value.trim()
      }
    }
  }

  // 解析採樣率
  const samplingRateStr = env[OTEL_ENV_VARS.TRACES_SAMPLER_ARG]
  const samplingRate = samplingRateStr ? parseFloat(samplingRateStr) : undefined

  // 解析啟用狀態
  const enabledStr = env[OTEL_ENV_VARS.GRAVITO_ENABLED]
  const enabled = enabledStr !== undefined ? enabledStr.toLowerCase() !== 'false' : undefined

  // 解析 Prometheus 端口
  const prometheusPortStr = env[OTEL_ENV_VARS.PROMETHEUS_PORT]
  const prometheusPort = prometheusPortStr ? parseInt(prometheusPortStr, 10) : undefined

  return {
    enabled,
    serviceName: env[OTEL_ENV_VARS.SERVICE_NAME],
    serviceVersion: env[OTEL_ENV_VARS.SERVICE_VERSION],
    environment: env[OTEL_ENV_VARS.DEPLOYMENT_ENVIRONMENT] || env.NODE_ENV,
    resourceAttributes: Object.keys(resourceAttrs).length > 0 ? resourceAttrs : undefined,
    tracing: {
      otlpEndpoint: env[OTEL_ENV_VARS.OTLP_TRACES_ENDPOINT] || env[OTEL_ENV_VARS.OTLP_ENDPOINT],
      jaegerEndpoint: env[OTEL_ENV_VARS.JAEGER_ENDPOINT],
      samplingRate: isValidSamplingRate(samplingRate) ? samplingRate : undefined,
    },
    metrics: {
      otlpEndpoint: env[OTEL_ENV_VARS.OTLP_METRICS_ENDPOINT] || env[OTEL_ENV_VARS.OTLP_ENDPOINT],
      prometheusPort: isValidPort(prometheusPort) ? prometheusPort : undefined,
    },
  }
}

/**
 * 驗證採樣率是否有效
 */
function isValidSamplingRate(rate: number | undefined): rate is number {
  return rate !== undefined && !Number.isNaN(rate) && rate >= 0 && rate <= 1
}

/**
 * 驗證端口是否有效
 */
function isValidPort(port: number | undefined): port is number {
  return port !== undefined && !Number.isNaN(port) && port > 0 && port <= 65535
}

/**
 * 合併配置（用戶 > 環境變數 > 預設值）
 *
 * @param userConfig - 用戶提供的配置
 * @returns 合併後的完整配置
 */
function mergeConfig(userConfig: OpenTelemetryConfig): OpenTelemetryConfigRequired {
  const envConfig = getConfigFromEnv()

  // 合併 tracing 配置
  const tracing: TracingConfigRequired = {
    enabled:
      userConfig.tracing?.enabled ?? envConfig.tracing?.enabled ?? DEFAULT_CONFIG.tracing.enabled,
    exporter: userConfig.tracing?.exporter ?? DEFAULT_CONFIG.tracing.exporter,
    jaegerEndpoint:
      userConfig.tracing?.jaegerEndpoint ??
      envConfig.tracing?.jaegerEndpoint ??
      DEFAULT_CONFIG.tracing.jaegerEndpoint,
    otlpEndpoint:
      userConfig.tracing?.otlpEndpoint ??
      envConfig.tracing?.otlpEndpoint ??
      DEFAULT_CONFIG.tracing.otlpEndpoint,
    samplingRate: normalizeSamplingRate(
      userConfig.tracing?.samplingRate ??
        envConfig.tracing?.samplingRate ??
        DEFAULT_CONFIG.tracing.samplingRate
    ),
    autoInstrumentation:
      userConfig.tracing?.autoInstrumentation ?? DEFAULT_CONFIG.tracing.autoInstrumentation,
    batchConfig: {
      maxExportBatchSize:
        userConfig.tracing?.batchConfig?.maxExportBatchSize ??
        DEFAULT_CONFIG.tracing.batchConfig.maxExportBatchSize,
      scheduledDelayMillis:
        userConfig.tracing?.batchConfig?.scheduledDelayMillis ??
        DEFAULT_CONFIG.tracing.batchConfig.scheduledDelayMillis,
      exportTimeoutMillis:
        userConfig.tracing?.batchConfig?.exportTimeoutMillis ??
        DEFAULT_CONFIG.tracing.batchConfig.exportTimeoutMillis,
      maxQueueSize:
        userConfig.tracing?.batchConfig?.maxQueueSize ??
        DEFAULT_CONFIG.tracing.batchConfig.maxQueueSize,
    },
  }

  // 合併 metrics 配置
  const metrics: MetricsConfigRequired = {
    enabled:
      userConfig.metrics?.enabled ?? envConfig.metrics?.enabled ?? DEFAULT_CONFIG.metrics.enabled,
    exporter: userConfig.metrics?.exporter ?? DEFAULT_CONFIG.metrics.exporter,
    prometheusPort: normalizePort(
      userConfig.metrics?.prometheusPort ??
        envConfig.metrics?.prometheusPort ??
        DEFAULT_CONFIG.metrics.prometheusPort
    ),
    prometheusEndpoint:
      userConfig.metrics?.prometheusEndpoint ?? DEFAULT_CONFIG.metrics.prometheusEndpoint,
    otlpEndpoint:
      userConfig.metrics?.otlpEndpoint ??
      envConfig.metrics?.otlpEndpoint ??
      DEFAULT_CONFIG.metrics.otlpEndpoint,
    exportIntervalMillis:
      userConfig.metrics?.exportIntervalMillis ?? DEFAULT_CONFIG.metrics.exportIntervalMillis,
  }

  // 合併頂層配置
  return {
    enabled: userConfig.enabled ?? envConfig.enabled ?? DEFAULT_CONFIG.enabled,
    serviceName: userConfig.serviceName ?? envConfig.serviceName ?? DEFAULT_CONFIG.serviceName,
    serviceVersion:
      userConfig.serviceVersion ?? envConfig.serviceVersion ?? DEFAULT_CONFIG.serviceVersion,
    environment: (userConfig.environment ?? envConfig.environment ?? DEFAULT_CONFIG.environment) as
      | 'development'
      | 'staging'
      | 'production',
    resourceAttributes: {
      ...DEFAULT_CONFIG.resourceAttributes,
      ...envConfig.resourceAttributes,
      ...userConfig.resourceAttributes,
    },
    logInitialization: userConfig.logInitialization ?? DEFAULT_CONFIG.logInitialization,
    tracing,
    metrics,
  }
}

/**
 * 正規化採樣率（限制在 0-1 範圍內）
 */
function normalizeSamplingRate(rate: number): number {
  if (Number.isNaN(rate)) {
    return DEFAULT_CONFIG.tracing.samplingRate
  }
  return Math.max(0, Math.min(1, rate))
}

/**
 * 正規化端口（使用預設值如果無效）
 */
function normalizePort(port: number): number {
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    return DEFAULT_CONFIG.metrics.prometheusPort
  }
  return port
}

/**
 * 設置 Tracing（追蹤）
 *
 * @param config - 完整配置
 * @returns Tracer Provider 或 null
 */
async function setupTracing(
  config: OpenTelemetryConfigRequired
): Promise<{ provider: unknown; processor: unknown } | null> {
  if (!config.tracing.enabled) {
    return null
  }

  try {
    // 動態導入 OpenTelemetry 模塊
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node')
    const { BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter } = await import(
      '@opentelemetry/sdk-trace-base'
    )
    const { Resource } = await import('@opentelemetry/resources')
    const otelApi = await import('@opentelemetry/api')

    // 使用字符串常量避免 semantic-conventions 依賴問題
    const ATTR_SERVICE_NAME = 'service.name'
    const ATTR_SERVICE_VERSION = 'service.version'
    const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment'

    // 創建 Resource
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.environment,
      ...config.resourceAttributes,
    })

    // 創建 Tracer Provider
    const provider = new NodeTracerProvider({
      resource,
    })

    // 根據導出器類型創建 Span Processor
    let processor: unknown

    switch (config.tracing.exporter) {
      case 'jaeger': {
        try {
          const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger')
          const exporter = new JaegerExporter({
            endpoint: config.tracing.jaegerEndpoint,
          })
          processor = new BatchSpanProcessor(exporter, config.tracing.batchConfig)
        } catch {
          // Jaeger 導出器不可用，回退到 console
          if (config.logInitialization) {
            console.warn('[OpenTelemetry] Jaeger exporter not available, falling back to console')
          }
          processor = new SimpleSpanProcessor(new ConsoleSpanExporter())
        }
        break
      }

      case 'otlp': {
        try {
          const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
          const exporter = new OTLPTraceExporter({
            url: `${config.tracing.otlpEndpoint}/v1/traces`,
          })
          processor = new BatchSpanProcessor(exporter, config.tracing.batchConfig)
        } catch {
          // OTLP 導出器不可用，回退到 console
          if (config.logInitialization) {
            console.warn(
              '[OpenTelemetry] OTLP trace exporter not available, falling back to console'
            )
          }
          processor = new SimpleSpanProcessor(new ConsoleSpanExporter())
        }
        break
      }

      case 'console': {
        processor = new SimpleSpanProcessor(new ConsoleSpanExporter())
        break
      }
      default: {
        // 不使用任何導出器
        processor = null
        break
      }
    }

    if (processor) {
      provider.addSpanProcessor(processor as any)
    }

    // 註冊全局 Tracer Provider
    provider.register()
    otelApi.trace.setGlobalTracerProvider(provider)

    return { provider, processor }
  } catch (error) {
    if (config.logInitialization) {
      console.warn('[OpenTelemetry] Failed to setup tracing:', error)
    }
    return null
  }
}

/**
 * 設置 Metrics（指標）
 *
 * @param config - 完整配置
 * @returns Meter Provider 或 null
 */
async function setupMetrics(config: OpenTelemetryConfigRequired): Promise<unknown | null> {
  if (!config.metrics.enabled) {
    return null
  }

  try {
    // 動態導入 OpenTelemetry 模塊
    const { MeterProvider, PeriodicExportingMetricReader, ConsoleMetricExporter } = await import(
      '@opentelemetry/sdk-metrics'
    )
    const { Resource } = await import('@opentelemetry/resources')
    const otelApi = await import('@opentelemetry/api')

    // 使用字符串常量
    const ATTR_SERVICE_NAME = 'service.name'
    const ATTR_SERVICE_VERSION = 'service.version'
    const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment'

    // 創建 Resource
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.environment,
      ...config.resourceAttributes,
    })

    let metricReader: unknown

    switch (config.metrics.exporter) {
      case 'prometheus': {
        try {
          const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus')
          metricReader = new PrometheusExporter({
            port: config.metrics.prometheusPort,
            endpoint: config.metrics.prometheusEndpoint,
          })
        } catch {
          // Prometheus 導出器不可用，回退到 console
          if (config.logInitialization) {
            console.warn(
              '[OpenTelemetry] Prometheus exporter not available, falling back to console'
            )
          }
          metricReader = new PeriodicExportingMetricReader({
            exporter: new ConsoleMetricExporter(),
            exportIntervalMillis: config.metrics.exportIntervalMillis,
          })
        }
        break
      }

      case 'otlp': {
        try {
          const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http')
          metricReader = new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
              url: `${config.metrics.otlpEndpoint}/v1/metrics`,
            }),
            exportIntervalMillis: config.metrics.exportIntervalMillis,
          })
        } catch {
          // OTLP 導出器不可用，回退到 console
          if (config.logInitialization) {
            console.warn(
              '[OpenTelemetry] OTLP metric exporter not available, falling back to console'
            )
          }
          metricReader = new PeriodicExportingMetricReader({
            exporter: new ConsoleMetricExporter(),
            exportIntervalMillis: config.metrics.exportIntervalMillis,
          })
        }
        break
      }

      case 'console': {
        metricReader = new PeriodicExportingMetricReader({
          exporter: new ConsoleMetricExporter(),
          exportIntervalMillis: config.metrics.exportIntervalMillis,
        })
        break
      }
      default: {
        // 不使用任何導出器
        metricReader = null
        break
      }
    }

    // 創建 Meter Provider
    const meterProvider = new MeterProvider({
      resource,
      readers: metricReader ? [metricReader as any] : [],
    })

    // 設置全局 Meter Provider
    otelApi.metrics.setGlobalMeterProvider(meterProvider)

    return meterProvider
  } catch (error) {
    if (config.logInitialization) {
      console.warn('[OpenTelemetry] Failed to setup metrics:', error)
    }
    return null
  }
}

/**
 * 初始化 OpenTelemetry SDK
 *
 * @param userConfig - 用戶配置
 * @returns OpenTelemetry SDK 實例或 null（如果禁用或初始化失敗）
 *
 * @example
 * ```typescript
 * // 基本用法
 * const sdk = await setupOpenTelemetry({
 *   serviceName: 'my-service'
 * })
 *
 * // 完整配置
 * const sdk = await setupOpenTelemetry({
 *   serviceName: 'my-service',
 *   serviceVersion: '2.0.0',
 *   environment: 'production',
 *   tracing: {
 *     enabled: true,
 *     exporter: 'jaeger',
 *     jaegerEndpoint: 'http://jaeger:14268/api/traces',
 *     samplingRate: 0.1
 *   },
 *   metrics: {
 *     enabled: true,
 *     exporter: 'prometheus',
 *     prometheusPort: 9090
 *   }
 * })
 * ```
 *
 * @public
 */
export async function setupOpenTelemetry(
  userConfig: OpenTelemetryConfig = {}
): Promise<OpenTelemetrySDK | null> {
  // 如果已初始化，返回現有實例
  if (isInitialized) {
    return globalSDK
  }

  // 合併配置
  const config = mergeConfig(userConfig)

  // 標記為已初始化（避免重複調用）
  isInitialized = true

  // 如果禁用，返回 null
  if (!config.enabled) {
    if (config.logInitialization) {
      console.log('[OpenTelemetry] SDK is disabled')
    }
    return null
  }

  try {
    // 設置 Tracing
    const tracingResult = await setupTracing(config)

    // 設置 Metrics
    const meterProvider = await setupMetrics(config)

    // 創建 SDK 實例
    const sdk: OpenTelemetrySDK = {
      isStarted: true,
      isShutdown: false,
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      tracerProvider: tracingResult?.provider ?? null,
      meterProvider,
      config,
      shutdown: async () => {
        await shutdownOpenTelemetryInternal(sdk)
      },
    }

    globalSDK = sdk

    // 輸出初始化日誌
    if (config.logInitialization) {
      console.log('[OpenTelemetry] SDK initialized')
      console.log(`  Service: ${config.serviceName}@${config.serviceVersion}`)
      console.log(`  Environment: ${config.environment}`)
      console.log(`  Tracing: ${config.tracing.enabled ? config.tracing.exporter : 'disabled'}`)
      console.log(`  Metrics: ${config.metrics.enabled ? config.metrics.exporter : 'disabled'}`)
      if (config.tracing.enabled) {
        console.log(`  Sampling Rate: ${(config.tracing.samplingRate * 100).toFixed(1)}%`)
      }
    }

    return sdk
  } catch (error) {
    if (config.logInitialization) {
      console.error('[OpenTelemetry] Failed to initialize SDK:', error)
    }
    return null
  }
}

/**
 * 內部關閉函數
 */
async function shutdownOpenTelemetryInternal(sdk: OpenTelemetrySDK): Promise<void> {
  if (sdk.isShutdown) {
    return
  }

  try {
    // 關閉 Tracer Provider
    if (sdk.tracerProvider && typeof (sdk.tracerProvider as any).shutdown === 'function') {
      await (sdk.tracerProvider as any).shutdown()
    }

    // 關閉 Meter Provider
    if (sdk.meterProvider && typeof (sdk.meterProvider as any).shutdown === 'function') {
      await (sdk.meterProvider as any).shutdown()
    }

    sdk.isShutdown = true

    if (sdk.config.logInitialization) {
      console.log('[OpenTelemetry] SDK shutdown complete')
    }
  } catch (error) {
    if (sdk.config.logInitialization) {
      console.error('[OpenTelemetry] Error during shutdown:', error)
    }
  }
}

/**
 * 獲取全局 OpenTelemetry SDK 實例
 *
 * @returns SDK 實例或 null
 *
 * @example
 * ```typescript
 * const sdk = getOpenTelemetrySDK()
 * if (sdk) {
 *   console.log('Service:', sdk.serviceName)
 * }
 * ```
 *
 * @public
 */
export function getOpenTelemetrySDK(): OpenTelemetrySDK | null {
  return globalSDK
}

/**
 * 檢查 OpenTelemetry 是否已初始化
 *
 * @returns 初始化狀態
 *
 * @public
 */
export function isOpenTelemetryInitialized(): boolean {
  return isInitialized
}

/**
 * 關閉 OpenTelemetry SDK
 *
 * 應在應用程序關閉時調用，確保所有 spans 和 metrics 都被導出。
 *
 * @example
 * ```typescript
 * // 在應用程序退出前
 * process.on('SIGTERM', async () => {
 *   await shutdownOpenTelemetry()
 *   process.exit(0)
 * })
 * ```
 *
 * @public
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (globalSDK) {
    await globalSDK.shutdown()
  }
}

/**
 * 重置 OpenTelemetry SDK（主要用於測試）
 *
 * 關閉現有 SDK 並重置所有狀態，允許重新初始化。
 *
 * @internal
 */
export async function resetOpenTelemetry(): Promise<void> {
  if (globalSDK && !globalSDK.isShutdown) {
    try {
      await globalSDK.shutdown()
    } catch {
      // 忽略關閉錯誤
    }
  }
  globalSDK = null
  isInitialized = false
}

/**
 * 獲取 Tracer 實例
 *
 * @param name - Tracer 名稱（預設：@gravito/core）
 * @param version - Tracer 版本
 * @returns Tracer 實例
 *
 * @example
 * ```typescript
 * const tracer = getTracer('my-module')
 * const span = tracer.startSpan('my-operation')
 * // ... 執行操作
 * span.end()
 * ```
 *
 * @public
 */
export async function getTracer(name = '@gravito/core', version?: string) {
  try {
    const { trace } = await import('@opentelemetry/api')
    return trace.getTracer(name, version)
  } catch {
    // 返回 no-op tracer
    return {
      startSpan: () => ({
        end: () => {},
        setAttribute: () => {},
        setStatus: () => {},
        recordException: () => {},
        addEvent: () => {},
        isRecording: () => false,
      }),
      startActiveSpan: (_name: string, fn: (span: any) => any) =>
        fn({
          end: () => {},
          setAttribute: () => {},
          setStatus: () => {},
          recordException: () => {},
          addEvent: () => {},
          isRecording: () => false,
        }),
    }
  }
}

/**
 * 獲取 Meter 實例
 *
 * @param name - Meter 名稱（預設：@gravito/core）
 * @param version - Meter 版本
 * @returns Meter 實例
 *
 * @example
 * ```typescript
 * const meter = getMeter('my-module')
 * const counter = meter.createCounter('my_counter')
 * counter.add(1, { key: 'value' })
 * ```
 *
 * @public
 */
export async function getMeter(name = '@gravito/core', version?: string) {
  try {
    const { metrics } = await import('@opentelemetry/api')
    return metrics.getMeter(name, version)
  } catch {
    // 返回 no-op meter
    return {
      createCounter: () => ({ add: () => {} }),
      createHistogram: () => ({ record: () => {} }),
      createUpDownCounter: () => ({ add: () => {} }),
      createObservableCounter: () => ({ addCallback: () => {} }),
      createObservableGauge: () => ({ addCallback: () => {} }),
      createObservableUpDownCounter: () => ({ addCallback: () => {} }),
    }
  }
}
