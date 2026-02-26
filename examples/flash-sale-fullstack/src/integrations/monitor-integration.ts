/**
 * 監控整合
 *
 * 將監控和可觀測性集成到業務邏輯中：
 * - 記錄訂單、支付、庫存指標
 * - 追蹤業務操作執行時間
 * - 進行分布式追蹤
 */

import type { PlanetCore } from '@gravito/core'
import type { BusinessMetrics } from '../monitoring/metrics-integration'

/**
 * 設置監控整合
 *
 * 掛載 hooks 到業務操作，記錄指標和追蹤信息
 */
export function setupMonitoringIntegration(core: PlanetCore, metrics: BusinessMetrics): void {
  const logger = core.logger

  // ==================== 訂單指標 ====================

  /**
   * 訂單創建事件
   */
  core.hooks.addAction('order:created', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Order created: ${payload.orderId}`)
      // 記錄訂單創建指標
      metrics.ordersCreated.inc()
      // 增加活躍訂單計數
      const currentActive = parseInt((metrics.activeOrders as any).value || '0')
      ;(metrics.activeOrders as any).set(currentActive + 1)
    } catch (error) {
      logger.error('[Monitor] Error recording order creation metric', error)
    }
  })

  /**
   * 訂單完成事件
   */
  core.hooks.addAction('order:completed', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Order completed: ${payload.orderId}`)
      metrics.ordersCompleted.inc()
      // 減少活躍訂單計數
      const currentActive = parseInt((metrics.activeOrders as any).value || '0')
      ;(metrics.activeOrders as any).set(Math.max(0, currentActive - 1))
    } catch (error) {
      logger.error('[Monitor] Error recording order completion metric', error)
    }
  })

  /**
   * 訂單失敗事件
   */
  core.hooks.addAction('order:failed', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Order failed: ${payload.orderId}`)
      metrics.ordersFailed.inc()
      // 減少活躍訂單計數
      const currentActive = parseInt((metrics.activeOrders as any).value || '0')
      ;(metrics.activeOrders as any).set(Math.max(0, currentActive - 1))
    } catch (error) {
      logger.error('[Monitor] Error recording order failure metric', error)
    }
  })

  // ==================== 支付指標 ====================

  /**
   * 支付初始化事件
   */
  core.hooks.addAction('payment:initiated', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Payment initiated: ${payload.paymentId}`)
      metrics.paymentsInitiated.inc({
        payment_method: payload.method || 'unknown',
      })
    } catch (error) {
      logger.error('[Monitor] Error recording payment initiation metric', error)
    }
  })

  /**
   * 支付完成事件
   */
  core.hooks.addAction('payment:completed', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Payment completed: ${payload.paymentId}`)
      metrics.paymentsCompleted.inc()
      // 記錄支付處理時間（秒）
      const processingTimeMs = payload.processingTimeMs || 0
      ;(metrics.paymentProcessingTime as any).observe(processingTimeMs / 1000)
    } catch (error) {
      logger.error('[Monitor] Error recording payment completion metric', error)
    }
  })

  /**
   * 支付失敗事件
   */
  core.hooks.addAction('payment:failed', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Payment failed: ${payload.paymentId}`)
      metrics.paymentsFailed.inc({
        failure_reason: payload.reason || 'unknown',
      })
    } catch (error) {
      logger.error('[Monitor] Error recording payment failure metric', error)
    }
  })

  // ==================== 庫存指標 ====================

  /**
   * 庫存扣除事件
   */
  core.hooks.addAction('inventory:deducted', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Inventory deducted: ${payload.productId} x ${payload.quantity}`)
      metrics.inventoryDeductions.inc({
        product_id: payload.productId,
      })
    } catch (error) {
      logger.error('[Monitor] Error recording inventory deduction metric', error)
    }
  })

  /**
   * 庫存恢復事件（訂單取消、支付失敗等）
   */
  core.hooks.addAction('inventory:restored', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Inventory restored: ${payload.productId} x ${payload.quantity}`)
      metrics.inventoryRestores.inc()
    } catch (error) {
      logger.error('[Monitor] Error recording inventory restore metric', error)
    }
  })

  /**
   * 庫存鎖定事件
   */
  core.hooks.addAction('inventory:locked', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Inventory locked: ${payload.productId}`)
      metrics.inventoryLocked.inc()
    } catch (error) {
      logger.error('[Monitor] Error recording inventory lock metric', error)
    }
  })

  // ==================== 快閃活動指標 ====================

  /**
   * 快閃活動狀態更新
   */
  core.hooks.addAction('flash-sale:status-changed', async (payload: any) => {
    try {
      const { saleId, status } = payload
      logger.debug(`[Monitor] Flash sale status changed: ${saleId} -> ${status}`)

      if (status === 'active') {
        // 更新活躍快閃活動數量
        const currentActive = parseInt((metrics.flashSalesActive as any).value || '0')
        ;(metrics.flashSalesActive as any).set(currentActive + 1)
      } else if (status === 'ended') {
        const currentActive = parseInt((metrics.flashSalesActive as any).value || '0')
        ;(metrics.flashSalesActive as any).set(Math.max(0, currentActive - 1))
      }
    } catch (error) {
      logger.error('[Monitor] Error recording flash sale status change', error)
    }
  })

  /**
   * 快閃活動轉化（用戶從快閃活動購買）
   */
  core.hooks.addAction('flash-sale:converted', async (payload: any) => {
    try {
      logger.debug(`[Monitor] Flash sale converted: ${payload.saleId}`)
      metrics.flashSalesConversions.inc({
        sale_id: payload.saleId,
      })
    } catch (error) {
      logger.error('[Monitor] Error recording flash sale conversion', error)
    }
  })

  // ==================== 容錯機制指標 ====================

  /**
   * 熔斷器狀態改變
   */
  core.hooks.addAction('resilience:circuit-breaker-state-changed', async (payload: any) => {
    try {
      const { name, state } = payload
      logger.info(`[Monitor] Circuit breaker state changed: ${name} -> ${state}`)
      // 這些指標由 resilience 模組本身記錄，這裡只是記錄日誌用於追蹤
    } catch (error) {
      logger.error('[Monitor] Error logging circuit breaker state change', error)
    }
  })

  /**
   * 背壓狀態改變
   */
  core.hooks.addAction('resilience:backpressure-triggered', async (payload: any) => {
    try {
      const { level } = payload
      logger.warn(`[Monitor] Backpressure triggered: level ${level}`)
      // 背壓狀態變化已由 resilience 模組管理
    } catch (error) {
      logger.error('[Monitor] Error logging backpressure event', error)
    }
  })

  logger.info('[Monitor] Integration hooks registered')
  logger.info('[Monitor] - Order metrics (created, completed, failed, processing_time)')
  logger.info('[Monitor] - Payment metrics (initiated, completed, failed)')
  logger.info('[Monitor] - Inventory metrics (deducted, restored, locked)')
  logger.info('[Monitor] - Flash sale metrics (active, conversions)')
  logger.info('[Monitor] - Resilience events (circuit breaker, backpressure)')
}
