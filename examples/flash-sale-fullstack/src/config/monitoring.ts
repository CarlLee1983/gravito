/**
 * 可觀測性配置 (Monitoring, Observability & OpenTelemetry)
 */
export default {
  observability: {
    /**
     * 啟用事件系統可觀測性（metrics、tracing）
     */
    enabled: process.env.OBSERVABILITY_ENABLED !== 'false',

    /**
     * 啟用 OpenTelemetry 分佈式追蹤
     */
    tracing: process.env.OBSERVABILITY_TRACING !== 'false',

    /**
     * 指標名稱前綴
     */
    metricsPrefix: process.env.OBSERVABILITY_METRICS_PREFIX || 'gravito_event_',

    /**
     * Prometheus 指標配置
     */
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED !== 'false',
      port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
      endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics',
    },
  },

  openTelemetry: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'flash-sale-service',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    tracing: {
      enabled: process.env.OTEL_TRACING_ENABLED !== 'false',
      exporter: (process.env.OTEL_TRACING_EXPORTER || 'jaeger') as 'jaeger' | 'otlp' | 'console',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '0.1'),
    },
    metrics: {
      enabled: process.env.OTEL_METRICS_ENABLED !== 'false',
      exporter: (process.env.OTEL_METRICS_EXPORTER || 'prometheus') as 'prometheus' | 'otlp',
      prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    },
  },
}
