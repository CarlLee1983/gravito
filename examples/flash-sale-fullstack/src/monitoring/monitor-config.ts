/**
 * Monitor Configuration
 *
 * 監控和可觀測性配置：
 * - 健康檢查（Kubernetes probes）
 * - 指標收集（Prometheus）
 * - 分布式追蹤（OpenTelemetry）
 */

import type { MonitorConfig } from '@gravito/monitor'

/**
 * 監控配置
 *
 * 包括三個層面：
 * 1. Health Checks: /health, /ready, /live endpoints
 * 2. Metrics: Prometheus format at /metrics
 * 3. Tracing: OpenTelemetry OTLP integration
 */
export const MONITOR_CONFIG: MonitorConfig = {
  // ==================== 健康檢查配置 ====================
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
    // 單個檢查的超時時間（毫秒）
    timeout: 5000,
    // 快取健康檢查結果，減少重複檢查開銷
    // 0 = 不快取，每次都重新檢查
    cacheTtl: 5000, // 5 秒
  },

  // ==================== 指標配置 ====================
  metrics: {
    enabled: true,
    path: '/metrics',
    // 收集預設的運行時指標
    defaultMetrics: true,
    // 所有指標的前綴
    prefix: 'flash_sale_',
    // 預設標籤（會添加到所有指標）
    defaultLabels: {
      app: 'flash-sale-fullstack',
      environment: process.env.NODE_ENV || 'development',
    },
  },

  // ==================== 追蹤配置 ====================
  tracing: {
    enabled: process.env.OTEL_TRACING_ENABLED === 'true',
    serviceName: 'flash-sale-api',
    serviceVersion: '0.1.1',
    // OTLP 接收器端點
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    // 採樣率 (0.0 to 1.0)
    sampleRate: parseFloat(process.env.OTEL_TRACER_SAMPLE_RATE || '0.1'),
    // 資源屬性（用於追蹤信息）
    resourceAttributes: {
      deployment: process.env.DEPLOYMENT || 'development',
      region: process.env.REGION || 'local',
    },
  },
}

/**
 * 開發模式下的快速配置
 */
export const MONITOR_CONFIG_DEV: MonitorConfig = {
  health: {
    enabled: true,
    cacheTtl: 0, // 開發時不快取
  },
  metrics: {
    enabled: true,
    defaultMetrics: true,
  },
  tracing: {
    enabled: false, // 開發時預設不啟用
  },
}

/**
 * 生產模式配置
 */
export const MONITOR_CONFIG_PROD: MonitorConfig = {
  health: {
    enabled: true,
    cacheTtl: 5000, // 生產環境快取 5 秒
  },
  metrics: {
    enabled: true,
    defaultMetrics: true,
  },
  tracing: {
    enabled: true,
    sampleRate: 0.1, // 生產環境採樣率 10%
  },
}

/**
 * 根據環境選擇配置
 */
export function getMonitorConfig(
  env: string = process.env.NODE_ENV || 'development'
): MonitorConfig {
  switch (env) {
    case 'production':
      return MONITOR_CONFIG_PROD
    case 'development':
      return MONITOR_CONFIG_DEV
    default:
      return MONITOR_CONFIG
  }
}
