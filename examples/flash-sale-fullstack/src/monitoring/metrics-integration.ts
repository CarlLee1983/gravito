/**
 * 業務指標集成
 *
 * 為快閃購物系統註冊特定的業務指標：
 * - 訂單指標
 * - 庫存指標
 * - 支付指標
 * - 快閃活動指標
 */

import type { Logger } from '@gravito/core'
import type { Counter, Gauge, Histogram, MetricsRegistry } from '@gravito/monitor'

/**
 * 業務指標容器
 */
export interface BusinessMetrics {
  // ===== 訂單指標 =====
  ordersCreated: Counter
  ordersCompleted: Counter
  ordersFailed: Counter
  orderProcessingTime: Histogram
  activeOrders: Gauge

  // ===== 庫存指標 =====
  inventoryDeductions: Counter
  inventoryRestores: Counter
  inventoryLocked: Counter
  availableInventory: Gauge

  // ===== 支付指標 =====
  paymentsInitiated: Counter
  paymentsCompleted: Counter
  paymentsFailed: Counter
  paymentProcessingTime: Histogram

  // ===== 快閃活動指標 =====
  flashSalesActive: Gauge
  flashSalesViews: Counter
  flashSalesConversions: Counter
}

/**
 * 註冊業務指標到 MetricsRegistry
 */
export function registerBusinessMetrics(
  metricsRegistry: MetricsRegistry,
  logger?: Logger
): BusinessMetrics {
  logger?.info('[Metrics] Registering business metrics...')

  // ==================== 訂單指標 ====================
  const ordersCreated = metricsRegistry.counter({
    name: 'orders_created_total',
    help: 'Total number of orders created',
  })

  const ordersCompleted = metricsRegistry.counter({
    name: 'orders_completed_total',
    help: 'Total number of orders completed successfully',
  })

  const ordersFailed = metricsRegistry.counter({
    name: 'orders_failed_total',
    help: 'Total number of orders that failed',
  })

  const orderProcessingTime = metricsRegistry.histogram({
    name: 'order_processing_seconds',
    help: 'Order processing time in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  })

  const activeOrders = metricsRegistry.gauge({
    name: 'active_orders',
    help: 'Number of currently active orders',
  })

  // ==================== 庫存指標 ====================
  const inventoryDeductions = metricsRegistry.counter({
    name: 'inventory_deductions_total',
    help: 'Total number of inventory deductions',
    labels: ['product_id'],
  })

  const inventoryRestores = metricsRegistry.counter({
    name: 'inventory_restores_total',
    help: 'Total number of inventory restores (e.g., from failed orders)',
  })

  const inventoryLocked = metricsRegistry.counter({
    name: 'inventory_locked_total',
    help: 'Total number of times inventory was locked',
  })

  const availableInventory = metricsRegistry.gauge({
    name: 'available_inventory',
    help: 'Total available inventory across all products',
    labels: ['product_id'],
  })

  // ==================== 支付指標 ====================
  const paymentsInitiated = metricsRegistry.counter({
    name: 'payments_initiated_total',
    help: 'Total number of payment initiation requests',
    labels: ['payment_method'],
  })

  const paymentsCompleted = metricsRegistry.counter({
    name: 'payments_completed_total',
    help: 'Total number of completed payments',
  })

  const paymentsFailed = metricsRegistry.counter({
    name: 'payments_failed_total',
    help: 'Total number of failed payments',
    labels: ['failure_reason'],
  })

  const paymentProcessingTime = metricsRegistry.histogram({
    name: 'payment_processing_seconds',
    help: 'Payment processing time in seconds',
    buckets: [0.1, 0.5, 1, 2, 5],
  })

  // ==================== 快閃活動指標 ====================
  const flashSalesActive = metricsRegistry.gauge({
    name: 'flash_sales_active',
    help: 'Number of currently active flash sales',
  })

  const flashSalesViews = metricsRegistry.counter({
    name: 'flash_sales_views_total',
    help: 'Total flash sale page views',
    labels: ['sale_id'],
  })

  const flashSalesConversions = metricsRegistry.counter({
    name: 'flash_sales_conversions_total',
    help: 'Total conversions from flash sales',
    labels: ['sale_id'],
  })

  logger?.info('[Metrics] Business metrics registered successfully')
  logger?.debug('[Metrics] - Orders: created, completed, failed, processing_time, active')
  logger?.debug('[Metrics] - Inventory: deductions, restores, locked, available')
  logger?.debug('[Metrics] - Payments: initiated, completed, failed, processing_time')
  logger?.debug('[Metrics] - Flash Sales: active, views, conversions')

  return {
    ordersCreated,
    ordersCompleted,
    ordersFailed,
    orderProcessingTime,
    activeOrders,
    inventoryDeductions,
    inventoryRestores,
    inventoryLocked,
    availableInventory,
    paymentsInitiated,
    paymentsCompleted,
    paymentsFailed,
    paymentProcessingTime,
    flashSalesActive,
    flashSalesViews,
    flashSalesConversions,
  }
}

/**
 * 記錄訂單事件指標
 */
export function recordOrderMetrics(
  metrics: BusinessMetrics,
  event: 'created' | 'completed' | 'failed'
): void {
  switch (event) {
    case 'created':
      metrics.ordersCreated.inc()
      break
    case 'completed':
      metrics.ordersCompleted.inc()
      break
    case 'failed':
      metrics.ordersFailed.inc()
      break
  }
}

/**
 * 記錄支付指標
 */
export function recordPaymentMetrics(
  metrics: BusinessMetrics,
  event: 'initiated' | 'completed' | 'failed',
  method?: string,
  reason?: string
): void {
  switch (event) {
    case 'initiated':
      metrics.paymentsInitiated.inc({ payment_method: method || 'unknown' })
      break
    case 'completed':
      metrics.paymentsCompleted.inc()
      break
    case 'failed':
      metrics.paymentsFailed.inc({ failure_reason: reason || 'unknown' })
      break
  }
}

/**
 * 記錄庫存指標
 */
export function recordInventoryMetrics(
  metrics: BusinessMetrics,
  event: 'deducted' | 'restored' | 'locked',
  productId?: string
): void {
  switch (event) {
    case 'deducted':
      metrics.inventoryDeductions.inc({ product_id: productId || 'unknown' })
      break
    case 'restored':
      metrics.inventoryRestores.inc()
      break
    case 'locked':
      metrics.inventoryLocked.inc()
      break
  }
}

/**
 * 記錄快閃活動指標
 */
export function recordFlashSaleMetrics(
  metrics: BusinessMetrics,
  event: 'viewed' | 'converted',
  saleId: string
): void {
  switch (event) {
    case 'viewed':
      metrics.flashSalesViews.inc({ sale_id: saleId })
      break
    case 'converted':
      metrics.flashSalesConversions.inc({ sale_id: saleId })
      break
  }
}
