/**
 * Resilience Integration Handler
 *
 * 整合 Resilience 機制到支付和庫存操作中：
 * - 支付 API 呼叫使用 Circuit Breaker
 * - 庫存查詢受 Circuit Breaker 保護
 * - 隊列背壓管理
 * - 事件去重
 * - DLQ 處理失敗消息
 */

import type { PlanetCore } from '@gravito/core'
import {
  addEventForDeduplication,
  addToDeadLetterQueue,
  executeWithInventoryCircuitBreaker,
  executeWithPaymentCircuitBreaker,
} from '../resilience/utils'
import { withSpan } from '../tracing/tracer'

/**
 * 設置 Resilience 整合
 *
 * 掛載 hooks 到支付和庫存操作，應用容錯機制
 */
export function setupResilienceIntegration(core: PlanetCore): void {
  const logger = core.logger

  // ==================== 支付成功事件 ====================
  // 使用 Event Deduplication 防止重複支付成功事件
  core.hooks.addAction('payment:succeeded', async (payload: any) => {
    try {
      await withSpan(
        'resilience.payment_succeeded_dedup',
        {
          'order.id': payload.orderId,
          'resilience.mechanism': 'deduplication',
        },
        async (_span) => {
          // 為事件添加去重模式
          addEventForDeduplication({
            id: `payment_success_${payload.orderId}`,
            name: 'payment_succeeded',
            options: { priority: 'high' },
            createdAt: Date.now(),
          })

          logger.info(`[Resilience] ✅ Payment succeeded for order: ${payload.orderId}`)
        }
      )
    } catch (error) {
      logger.error('[Resilience] Error in payment success handler', error)
    }
  })

  // ==================== 支付失敗事件 ====================
  // 失敗消息進入 DLQ，進行重試或人工審查
  core.hooks.addAction('payment:failed', async (payload: any) => {
    try {
      await withSpan(
        'resilience.payment_failed_dlq',
        {
          'order.id': payload.orderId,
          'resilience.mechanism': 'dead_letter_queue',
          'error.message': payload.error?.message,
        },
        async (_span) => {
          logger.error(`[Resilience] ❌ Payment failed for order: ${payload.orderId}`)

          // 添加到 DLQ 以供稍後重試或人工處理
          addToDeadLetterQueue(
            {
              source: 'manual',
              eventName: 'payment:failed',
              payload: {
                orderId: payload.orderId,
                amount: payload.amount,
                reason: payload.error?.message,
              },
              error: payload.error,
            },
            logger
          )

          logger.info(`[Resilience] Message added to DLQ for retry`)
        }
      )
    } catch (error) {
      logger.error('[Resilience] Error in payment failed handler', error)
    }
  })

  // ==================== 庫存查詢 ====================
  // 庫存查詢受 Circuit Breaker 保護，防止級聯故障
  core.hooks.addAction('inventory:query', async (payload: any) => {
    try {
      await withSpan(
        'resilience.inventory_circuit_breaker',
        {
          'product.id': payload.productId,
          'resilience.mechanism': 'circuit_breaker',
        },
        async (_span) => {
          // 以 Circuit Breaker 方式執行庫存查詢
          const available = await executeWithInventoryCircuitBreaker(async () => {
            logger.debug(`[Resilience] Querying inventory for product: ${payload.productId}`)
            // 實際的庫存查詢邏輯會在這裡進行
            // return await inventoryService.getAvailableQuantity(payload.productId)
            return 100 // 模擬返回
          }, logger)

          logger.info(`[Resilience] Inventory available: ${available}`)
        }
      )
    } catch (error) {
      logger.error('[Resilience] Inventory query failed, circuit may be open', error)
    }
  })

  // ==================== 庫存扣減 ====================
  // 使用事件去重管理庫存扣減事件
  core.hooks.addAction('inventory:deduct', async (payload: any) => {
    try {
      await withSpan(
        'resilience.inventory_deduction',
        {
          'order.id': payload.orderId,
          'product.id': payload.productId,
          'resilience.mechanism': 'deduplication',
        },
        async (_span) => {
          logger.info(`[Resilience] Processing inventory deduction for order: ${payload.orderId}`)

          // 為事件添加去重（防止重複扣減同一訂單的庫存）
          addEventForDeduplication({
            id: `inventory_deduct_${payload.orderId}`,
            name: 'inventory_deduct',
            options: { priority: payload.isPaid ? 'high' : 'normal' },
            createdAt: Date.now(),
          })

          logger.info(
            `[Resilience] Deduction recorded for order: ${payload.orderId}, priority: ${payload.isPaid ? 'high' : 'normal'}`
          )
        }
      )
    } catch (error) {
      logger.error('[Resilience] Failed to record inventory deduction', error)
    }
  })

  // ==================== 訂單創建 ====================
  // 支付 API 呼叫使用 Circuit Breaker
  core.hooks.addAction('order:create', async (payload: any) => {
    try {
      await withSpan(
        'resilience.order_payment_circuit_breaker',
        {
          'order.id': payload.orderId,
          'resilience.mechanism': 'circuit_breaker',
        },
        async (_span) => {
          logger.info(`[Resilience] Creating order with payment: ${payload.orderId}`)

          // 以 Circuit Breaker 方式執行支付
          await executeWithPaymentCircuitBreaker(async () => {
            logger.debug(`[Resilience] Processing payment for order: ${payload.orderId}`)
            // 實際的支付邏輯會在這裡進行
            // return await paymentService.charge(payload.amount)
            return { success: true }
          }, logger)

          logger.info(`[Resilience] Order payment processed: ${payload.orderId}`)
        }
      )
    } catch (error) {
      logger.error('[Resilience] Order creation failed due to payment error', error)

      // 添加到 DLQ 進行後續處理
      addToDeadLetterQueue(
        {
          source: 'manual',
          eventName: 'order:create',
          payload: {
            orderId: payload.orderId,
            amount: payload.amount,
          },
          error: error as Error,
        },
        logger
      )
    }
  })

  logger.info('[Resilience] Integration hooks registered')
}
