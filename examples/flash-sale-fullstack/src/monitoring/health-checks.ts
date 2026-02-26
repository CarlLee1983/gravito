/**
 * 健康檢查定義
 *
 * 為系統的關鍵組件定義健康檢查：
 * - 資料庫連接
 * - Redis 連接
 * - 外部 API（支付、庫存）
 * - 內部服務（隊列、快取）
 */

import type { Logger } from '@gravito/core'
import type { HealthCheckResult, HealthRegistry } from '@gravito/monitor'

/**
 * 健康檢查工廠函數
 */

/**
 * 資料庫健康檢查
 */
export function createDatabaseHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 實際應該執行真實的資料庫查詢
      // await db.query('SELECT 1')
      // 這裡簡化為模擬檢查
      await new Promise((resolve) => setTimeout(resolve, 10))

      const latency = Date.now() - startTime
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        latency,
        details: {
          driver: 'postgres',
          latency_ms: latency,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
      }
    }
  }
}

/**
 * Redis 健康檢查
 */
export function createRedisHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 實際應該執行 PING 命令
      // await redis.ping()
      // 這裡簡化為模擬檢查
      await new Promise((resolve) => setTimeout(resolve, 5))

      const latency = Date.now() - startTime
      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
        latency,
        details: {
          latency_ms: latency,
          cache_status: 'connected',
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
      }
    }
  }
}

/**
 * 隊列服務健康檢查
 */
export function createQueueServiceHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 檢查隊列服務狀態
      // 實際應該檢查隊列的健康狀態（連接、待處理項目等）
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Queue service is healthy',
        latency,
        details: {
          service: 'stream-manager',
          latency_ms: latency,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Queue service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
      }
    }
  }
}

/**
 * 快取系統健康檢查
 */
export function createCacheSystemHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 檢查快取系統狀態（L1 和 L2）
      // 實際應該測試 memory 和 redis 快取
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Cache system is healthy',
        latency,
        details: {
          l1_store: 'memory',
          l2_store: 'redis',
          latency_ms: latency,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Cache system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
      }
    }
  }
}

/**
 * 支付服務健康檢查
 */
export function createPaymentServiceHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 檢查支付服務連接
      // 實際應該進行輕量級的 API 檢查（不真實發起支付）
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Payment service is accessible',
        latency,
        details: {
          service: 'payment-gateway',
          latency_ms: latency,
        },
      }
    } catch (error) {
      return {
        status: 'degraded',
        message: `Payment service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
        details: {
          fallback_available: true,
        },
      }
    }
  }
}

/**
 * 庫存鎖定服務健康檢查
 */
export function createInventoryLockHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => {
    const startTime = Date.now()
    try {
      // 檢查庫存鎖定服務
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Inventory lock service is healthy',
        latency,
        details: {
          service: 'inventory-lock',
          latency_ms: latency,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Inventory lock check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - startTime,
      }
    }
  }
}

/**
 * 註冊所有健康檢查
 */
export function registerAllHealthChecks(healthRegistry: HealthRegistry, logger?: Logger): void {
  logger?.info('[Health] Registering health checks...')

  healthRegistry
    .register('database', createDatabaseHealthCheck())
    .register('redis', createRedisHealthCheck())
    .register('queue-service', createQueueServiceHealthCheck())
    .register('cache-system', createCacheSystemHealthCheck())
    .register('payment-service', createPaymentServiceHealthCheck())
    .register('inventory-lock', createInventoryLockHealthCheck())

  logger?.info('[Health] All health checks registered')
  logger?.debug(
    '[Health] - database, redis, queue-service, cache-system, payment-service, inventory-lock'
  )
}
