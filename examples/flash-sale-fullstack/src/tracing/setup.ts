/**
 * Flash Sale Tracing Setup
 *
 * 初始化 OpenTelemetry SDK，集成 @gravito/core 的 OTel 基礎設施
 */
import { type OpenTelemetryConfig, setupOpenTelemetry } from '@gravito/core'

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
  const otelConfig: OpenTelemetryConfig = {
    enabled: true,
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: config.environment,
    tracing: {
      enabled: config.tracing.enabled,
      exporter: config.tracing.exporter,
      jaegerEndpoint: config.tracing.jaegerEndpoint,
      samplingRate: config.tracing.samplingRate,
    },
    metrics: {
      enabled: config.metrics.enabled,
      exporter: config.metrics.exporter,
      prometheusPort: config.metrics.prometheusPort,
    },
  }

  return setupOpenTelemetry(otelConfig)
}
