/**
 * Flash Sale Tracing Setup
 *
 * 初始化 OpenTelemetry SDK，集成 @gravito/monitor 的 OTel 基礎設施
 *
 * @deprecated OpenTelemetry 已移到 @gravito/monitor（Phase 2.2）
 * TODO: 使用 @gravito/monitor 重新實現此模組
 */

export async function initializeTracing(config: {
  serviceName: string
  serviceVersion: string
  environment: string
  tracing: {
    enabled: boolean
    exporter: 'jaeger' | 'otlp' | 'console'
    jaegerEndpoint: string
    samplingRate: number
  }
  metrics: {
    enabled: boolean
    exporter: 'prometheus' | 'otlp'
    prometheusPort: number
  }
}) {
  // TODO: 遷移到 @gravito/monitor 進行 OpenTelemetry 設置
  console.log(
    '[Tracing] OpenTelemetry initialization deferred to @gravito/monitor',
    {
      serviceName: config.serviceName,
      environment: config.environment,
    }
  )
  return null
}
