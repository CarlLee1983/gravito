/**
 * Resilience Configuration
 *
 * 配置應用程式的容錯機制：
 * - Circuit Breaker: 支付、庫存查詢
 * - Backpressure Manager: 隊列背壓
 * - Deduplication Manager: 事件去重
 * - Dead Letter Queue: 失敗消息管理
 */

import type { PlanetCore } from '@gravito/core'
import {
  BackpressureManager,
  CircuitBreaker,
  DeadLetterQueue,
  DeduplicationManager,
} from '@gravito/resilience'

/**
 * 全局 Resilience 實例容器
 */
export interface ResilienceContext {
  circuitBreakers: {
    payment: CircuitBreaker
    inventory: CircuitBreaker
  }
  backpressure: BackpressureManager
  deduplication: DeduplicationManager
  deadLetterQueue: DeadLetterQueue
}

let resilienceContext: ResilienceContext | null = null

/**
 * 初始化 Resilience 上下文
 */
export async function initializeResilience(core: PlanetCore): Promise<ResilienceContext> {
  const logger = core.logger

  logger.info('[Resilience] Initializing resilience infrastructure')

  // 1. 支付 API Circuit Breaker
  //    - 失敗 5 次後打開
  //    - 30 秒後進入半開狀態嘗試恢復
  const paymentCircuitBreaker = new CircuitBreaker('payment-api', {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000, // 30 秒後進入半開狀態
    windowSize: 60000, // 60 秒的滑動視窗
    onOpen: () => logger.warn('[CircuitBreaker] Payment API circuit opened'),
    onHalfOpen: () => logger.info('[CircuitBreaker] Payment API circuit half-open'),
    onClose: () => logger.info('[CircuitBreaker] Payment API circuit closed'),
  })

  // 2. 庫存查詢 Circuit Breaker
  //    - 更寬鬆的規則（10 次失敗）
  const inventoryCircuitBreaker = new CircuitBreaker('inventory-query', {
    failureThreshold: 10,
    successThreshold: 3,
    resetTimeout: 60000, // 60 秒後進入半開狀態
    windowSize: 90000, // 90 秒的滑動視窗
    onOpen: () => logger.warn('[CircuitBreaker] Inventory circuit opened'),
  })

  // 3. 隊列背壓管理器
  //    - 監控隊列深度並防止溢位
  const backpressure = new BackpressureManager({
    enabled: true,
    maxQueueSize: 10000, // 最大隊列大小
    thresholds: {
      warning: 0.6, // 60% 時警告
      critical: 0.85, // 85% 時進入危急
      overflow: 1.0, // 100% 時溢位
    },
    onStateChange: (from, to) => {
      logger.info(`[Backpressure] State changed: ${from} → ${to}`)
    },
  })

  // 4. 事件去重管理器
  //    - 防止重複事件在短時間內重複處理
  const deduplication = new DeduplicationManager({
    windowMs: 10000, // 10 秒去重窗口
    cleanupIntervalMs: 30000, // 每 30 秒清理過期記錄
    enableCleanup: true,
  })

  // 5. 死信隊列
  //    - 處理失敗的支付和庫存操作
  const deadLetterQueue = new DeadLetterQueue(1000) // 最多保留 1000 條消息

  resilienceContext = {
    circuitBreakers: {
      payment: paymentCircuitBreaker,
      inventory: inventoryCircuitBreaker,
    },
    backpressure,
    deduplication,
    deadLetterQueue,
  }

  logger.info('[Resilience] ✅ Resilience infrastructure initialized')
  logger.info('[Resilience] - Payment Circuit Breaker: ready')
  logger.info('[Resilience] - Inventory Circuit Breaker: ready')
  logger.info('[Resilience] - Backpressure Manager: ready')
  logger.info('[Resilience] - Deduplication Manager: ready')
  logger.info('[Resilience] - Dead Letter Queue: ready')

  return resilienceContext
}

/**
 * 取得 Resilience 上下文
 */
export function getResilienceContext(): ResilienceContext {
  if (!resilienceContext) {
    throw new Error('ResilienceContext not initialized. Call initializeResilience() first.')
  }
  return resilienceContext
}

/**
 * 清理 Resilience 資源
 */
export async function shutdownResilience(): Promise<void> {
  if (!resilienceContext) {
    return
  }

  // 重設 Circuit Breaker（重置狀態）
  resilienceContext.circuitBreakers.payment.reset()
  resilienceContext.circuitBreakers.inventory.reset()

  resilienceContext = null
}
