/**
 * Resilience Utilities
 *
 * 便捷函數用於在應用程式中使用容錯機制
 */

import type { Logger } from '@gravito/core'
import { getResilienceContext } from './config'

/**
 * 以 Circuit Breaker 方式執行支付操作
 *
 * 範例：
 * ```
 * const result = await executeWithPaymentCircuitBreaker(async () => {
 *   return await paymentAPI.charge(orderId, amount)
 * }, logger)
 * ```
 */
export async function executeWithPaymentCircuitBreaker<T>(
  fn: () => Promise<T>,
  logger: Logger
): Promise<T> {
  const { circuitBreakers } = getResilienceContext()
  const breaker = circuitBreakers.payment

  try {
    return await breaker.execute(fn)
  } catch (error) {
    if ((error as Error).message.includes('OPEN')) {
      logger.error('[Payment] Circuit breaker is OPEN, rejecting request')
      throw new Error('Payment service unavailable (circuit open)')
    }
    logger.error('[Payment] Request failed', error)
    throw error
  }
}

/**
 * 以 Circuit Breaker 方式執行庫存查詢
 */
export async function executeWithInventoryCircuitBreaker<T>(
  fn: () => Promise<T>,
  logger: Logger
): Promise<T> {
  const { circuitBreakers } = getResilienceContext()
  const breaker = circuitBreakers.inventory

  try {
    return await breaker.execute(fn)
  } catch (error) {
    if ((error as Error).message.includes('OPEN')) {
      logger.warn('[Inventory] Circuit breaker is OPEN, using fallback')
      throw new Error('Inventory service unavailable (circuit open)')
    }
    logger.error('[Inventory] Request failed', error)
    throw error
  }
}

/**
 * 檢查 Circuit Breaker 狀態
 */
export function getCircuitBreakerMetrics() {
  const { circuitBreakers } = getResilienceContext()

  return {
    payment: circuitBreakers.payment.getMetrics(),
    inventory: circuitBreakers.inventory.getMetrics(),
  }
}

/**
 * 檢查背壓狀態
 */
export function getBackpressureStatus() {
  return {
    enabled: true, // BackpressureManager 總是啟用的
    // 詳細狀態取決於實現
  }
}

/**
 * 為事件添加去重模式
 *
 * 範例：
 * ```
 * const eventTask = {
 *   id: 'evt_123',
 *   name: 'payment_success',
 *   options: { priority: 'high' },
 *   createdAt: Date.now()
 * }
 * addEventForDeduplication(eventTask)
 * ```
 */
export function addEventForDeduplication(eventTask: any): void {
  const { deduplication } = getResilienceContext()
  deduplication.addEvent(eventTask)
}

/**
 * 獲取已去重的事件
 */
export function getDeduplicated() {
  const { deduplication } = getResilienceContext()
  return deduplication.getDeduplicated()
}

/**
 * 清空去重管理器
 */
export function clearDeduplication(): void {
  const { deduplication } = getResilienceContext()
  deduplication.clear()
}

/**
 * 添加失敗消息到死信隊列
 *
 * 範例：
 * ```
 * await addToDeadLetterQueue({
 *   source: 'manual',
 *   eventName: 'payment:failed',
 *   payload: { orderId, amount },
 *   error: paymentError,
 * }, logger)
 * ```
 */
export function addToDeadLetterQueue(
  message: {
    source: 'retry_exhausted' | 'circuit_breaker' | 'backpressure_overflow' | 'manual'
    eventName: string
    payload: unknown
    error?: Error
  },
  logger: Logger
): void {
  const { deadLetterQueue } = getResilienceContext()

  try {
    deadLetterQueue.add(
      message.eventName,
      message.payload,
      {}, // EventOptions，根據實際需求填入
      message.error || new Error('Unknown error'),
      0, // retryCount
      Date.now(), // firstFailedAt
      message.source
    )
    logger.info('[DLQ] Message added to dead letter queue')
  } catch (error) {
    logger.error('[DLQ] Failed to add message to DLQ', error)
    // 不拋出錯誤，防止主流程中斷
  }
}

/**
 * 獲取死信隊列項目（具有過濾選項）
 *
 * 範例：
 * ```
 * // 獲取所有項目
 * const all = getDeadLetterQueueEntries()
 *
 * // 獲取特定事件的項目
 * const paymentFailures = getDeadLetterQueueEntries({ eventName: 'payment:failed' })
 *
 * // 獲取最近 100 項
 * const recent = getDeadLetterQueueEntries({ limit: 100 })
 * ```
 */
export function getDeadLetterQueueEntries(filter?: {
  eventName?: string
  from?: number
  to?: number
  limit?: number
}) {
  const { deadLetterQueue } = getResilienceContext()
  return deadLetterQueue.list(filter)
}

/**
 * 獲取死信隊列統計
 */
export function getDeadLetterQueueStats() {
  const { deadLetterQueue } = getResilienceContext()
  const entries = deadLetterQueue.list()
  return {
    count: entries.length,
    // 其他統計信息取決於實現
  }
}

/**
 * 獲取 Resilience 統計資訊
 */
export function getResilienceMetrics() {
  const context = getResilienceContext()

  return {
    circuitBreakers: {
      payment: context.circuitBreakers.payment.getMetrics(),
      inventory: context.circuitBreakers.inventory.getMetrics(),
    },
    deadLetterQueue: getDeadLetterQueueStats(),
  }
}
