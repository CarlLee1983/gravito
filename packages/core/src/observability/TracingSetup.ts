/**
 * @gravito/core - Tracing Setup
 *
 * OpenTelemetry 初始化與配置，支持自動儀器化。
 */

import { trace } from '@opentelemetry/api'

/**
 * NodeTracerProvider 類型（不導入實現，保持為可選）
 */
export type NodeTracerProvider = any

/**
 * Tracing 配置選項
 */
export interface TracingSetupOptions {
  /** 服務名稱 */
  serviceName?: string
  /** 服務版本 */
  serviceVersion?: string
  /** Jaeger 端點 */
  jaegerEndpoint?: string
  /** 採樣率（0-1） */
  samplingRate?: number
  /** 是否啟用自動儀器化 */
  autoInstrumentation?: boolean
  /** 環境名稱 */
  environment?: 'development' | 'staging' | 'production'
}

const DEFAULTS = {
  serviceName: 'gravito-app',
  serviceVersion: '1.0.0',
  jaegerEndpoint: 'http://localhost:14268/api/traces',
  samplingRate: 0.1, // 10% 採樣率
  autoInstrumentation: true,
  environment: 'development',
}

/**
 * 全局 Tracing 實例
 */
let globalTracingProvider: NodeTracerProvider | null = null
let isInitialized = false

/**
 * 初始化 OpenTelemetry Tracing
 *
 * @param options - Tracing 配置
 * @returns Promise<NodeTracerProvider>
 *
 * @example
 * ```typescript
 * import { setupTracing } from '@gravito/core/observability'
 *
 * const provider = await setupTracing({
 *   serviceName: 'my-service',
 *   jaegerEndpoint: 'http://jaeger:14268/api/traces',
 *   samplingRate: 0.1
 * })
 * ```
 *
 * @public
 */
export async function setupTracing(
  options: TracingSetupOptions = {}
): Promise<NodeTracerProvider | null> {
  if (isInitialized) {
    return globalTracingProvider
  }

  const config = {
    serviceName: options.serviceName ?? process.env.OTEL_SERVICE_NAME ?? DEFAULTS.serviceName,
    serviceVersion:
      options.serviceVersion ?? process.env.OTEL_SERVICE_VERSION ?? DEFAULTS.serviceVersion,
    jaegerEndpoint:
      options.jaegerEndpoint ?? process.env.JAEGER_ENDPOINT ?? DEFAULTS.jaegerEndpoint,
    samplingRate:
      options.samplingRate ??
      parseFloat(process.env.OTEL_SAMPLING_RATE ?? String(DEFAULTS.samplingRate)),
    autoInstrumentation: options.autoInstrumentation ?? DEFAULTS.autoInstrumentation,
    environment: options.environment ?? (process.env.NODE_ENV as any) ?? DEFAULTS.environment,
  }

  try {
    // 動態導入 OpenTelemetry 模塊
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-node')
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node')
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger')
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { Resource } = await import('@opentelemetry/resources')
    // 使用簡單的常數而不是從 semantic-conventions 導入
    const ATTR_SERVICE_NAME = 'service.name'
    const ATTR_SERVICE_VERSION = 'service.version'
    const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment'
    // @ts-expect-error - OpenTelemetry 模塊是可選的
    const { registerInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')

    // 創建資源
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.environment,
    })

    // 創建 Tracer Provider
    const provider = new NodeTracerProvider({
      resource,
      sampler: {
        shouldSample: () => Math.random() < config.samplingRate,
        toString: () => `ProbabilitySampler{${config.samplingRate}}`,
      },
    })

    // 配置 Jaeger 導出器
    const jaegerExporter = new JaegerExporter({
      endpoint: config.jaegerEndpoint,
    })

    // 添加 Span 處理器
    provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter))

    // 註冊自動儀器化（如果啟用）
    if (config.autoInstrumentation) {
      try {
        registerInstrumentations({
          instrumentations: [
            // HTTP 儀器化
            { name: 'http' },
            // 數據庫儀器化
            { name: 'pg' },
            // Redis 儀器化
            { name: 'redis' },
            // DNS 儀器化
            { name: 'dns' },
          ],
        })
      } catch (error) {
        console.warn('[Tracing] Auto instrumentation setup failed:', error)
      }
    }

    // 註冊全局 Tracer Provider
    provider.register()

    globalTracingProvider = provider
    isInitialized = true

    console.log(`[Tracing] OpenTelemetry initialized`)
    console.log(`  Service: ${config.serviceName}@${config.serviceVersion}`)
    console.log(`  Environment: ${config.environment}`)
    console.log(`  Jaeger Endpoint: ${config.jaegerEndpoint}`)
    console.log(`  Sampling Rate: ${(config.samplingRate * 100).toFixed(1)}%`)

    return provider
  } catch (error) {
    console.warn('[Tracing] Failed to initialize OpenTelemetry:', error)
    console.log('[Tracing] Using fallback tracing (no external export)')

    // 返回 null 表示使用回退模式
    isInitialized = true
    return null
  }
}

/**
 * 獲取全局 Tracer 實例
 *
 * @param name - Tracer 名稱（預設：@gravito/core）
 * @returns Tracer 實例
 *
 * @example
 * ```typescript
 * import { getTracer } from '@gravito/core/observability'
 *
 * const tracer = getTracer('my-service')
 * const span = tracer.startSpan('my-operation')
 * ```
 *
 * @public
 */
export function getTracer(name = '@gravito/core') {
  return trace.getTracer(name)
}

/**
 * 關閉 Tracing（應在應用程序關閉時調用）
 *
 * @example
 * ```typescript
 * import { shutdownTracing } from '@gravito/core/observability'
 *
 * // 在應用程序退出前
 * await shutdownTracing()
 * ```
 *
 * @public
 */
export async function shutdownTracing(): Promise<void> {
  if (globalTracingProvider) {
    try {
      await (globalTracingProvider as any).shutdown()
      console.log('[Tracing] Shutdown complete')
    } catch (error) {
      console.error('[Tracing] Shutdown failed:', error)
    }
  }
}

/**
 * 檢查 Tracing 是否已初始化
 *
 * @returns 初始化狀態
 *
 * @public
 */
export function isTracingInitialized(): boolean {
  return isInitialized
}

/**
 * 獲取當前 Tracer Provider
 *
 * @returns NodeTracerProvider 或 null
 *
 * @internal
 */
export function getTracingProvider(): NodeTracerProvider | null {
  return globalTracingProvider
}
