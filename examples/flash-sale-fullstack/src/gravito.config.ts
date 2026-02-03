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

  satellites: [
    '@gravito/satellite-flash-sale',
    '@gravito/satellite-inventory-lock',
    '@gravito/satellite-payment',
  ],

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
}
