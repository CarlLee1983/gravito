/**
 * Gravito 應用配置
 *
 * 搶購系統的核心配置文件，包括模塊註冊、資料庫、Redis 等
 */

import type { GravitoConfig as Config } from '@gravito/core'

/**
 * 應用配置
 */
export const GravitoConfig: Config & any = {
  // ─────────────────────────────────────────────────────────────────────────
  // 基礎應用配置
  // ─────────────────────────────────────────────────────────────────────────
  basePath: process.cwd(),
  port: parseInt(process.env.HTTP_PORT || '3000', 10),

  // ─────────────────────────────────────────────────────────────────────────
  // 資料庫配置
  // ─────────────────────────────────────────────────────────────────────────

  database: {
    default: 'postgres',
    connections: {
      postgres: {
        driver: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'flash_sale',
        pool: {
          min: 2,
          max: 10,
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Redis 配置
  // ─────────────────────────────────────────────────────────────────────────

  redis: {
    default: 'cache',
    connections: {
      cache: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 日誌配置
  // ─────────────────────────────────────────────────────────────────────────

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Satellite 與 Provider
  // ─────────────────────────────────────────────────────────────────────────
  // Satellites are now registered directly in app.ts as providers

  // ─────────────────────────────────────────────────────────────────────────
  // 中間件配置
  // ─────────────────────────────────────────────────────────────────────────

  middleware: {
    // 全局中間件
    global: [
      'cors', // CORS 支持
      'logging', // 請求日誌
      'errorHandler', // 錯誤處理
    ],

    // 限流中間件（搶購系統特定）
    rateLimiter: {
      enabled: true,
      windowMs: 60000, // 1 分鐘
      maxRequests: 100, // 單個 IP 最多 100 請求
      endpoints: {
        '/api/orders': 10, // POST /api/orders 限制更嚴
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 搶購系統特定配置
  // ─────────────────────────────────────────────────────────────────────────

  flashSale: {
    // 庫存鎖定超時時間（秒）
    lockTimeoutSeconds: 15 * 60, // 15 分鐘

    // 分佈式鎖重試次數
    lockRetries: 3,

    // 支付超時時間（分鐘）
    paymentTimeoutMinutes: 30,

    // 非同步隊列配置
    queue: {
      // Bull 佇列名稱
      paymentProcessing: 'payment-processing',
      inventoryDeduction: 'inventory-deduction',
      orderConfirmation: 'order-confirmation',
      analytics: 'analytics-events',

      // 重試策略
      retry: {
        attempts: 3,
        backoff: 5000, // 5 秒
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 可觀測性配置
  // ─────────────────────────────────────────────────────────────────────────

  observability: {
    /**
     * 啟用事件系統可觀測性（metrics、tracing）
     * @env OBSERVABILITY_ENABLED
     */
    enabled: process.env.OBSERVABILITY_ENABLED !== 'false', // 預設啟用

    /**
     * 啟用 OpenTelemetry 分佈式追蹤
     * 注意：會增加性能開銷，建議僅在開發環境啟用
     * @env OBSERVABILITY_TRACING
     */
    tracing: process.env.OBSERVABILITY_TRACING !== 'false', // 改為預設啟用

    /**
     * 指標名稱前綴
     * @env OBSERVABILITY_METRICS_PREFIX
     */
    metricsPrefix: process.env.OBSERVABILITY_METRICS_PREFIX || 'gravito_event_',

    /**
     * Prometheus 指標配置
     */
    prometheus: {
      /**
       * 啟用 Prometheus metrics 端點
       * @env PROMETHEUS_ENABLED
       */
      enabled: process.env.PROMETHEUS_ENABLED !== 'false', // 預設啟用

      /**
       * Prometheus metrics 服務器端口
       * @env PROMETHEUS_PORT
       */
      port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),

      /**
       * Prometheus metrics 端點路徑
       * @env PROMETHEUS_ENDPOINT
       */
      endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OpenTelemetry 完整配置
  // ─────────────────────────────────────────────────────────────────────────

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
