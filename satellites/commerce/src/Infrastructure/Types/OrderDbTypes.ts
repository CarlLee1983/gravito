/**
 * 資料庫訂單相關資料列型別定義
 *
 * 用於 AtlasOrderRepository 中資料庫查詢結果的型別安全
 */

/**
 * 資料庫中訂單主表資料列
 */
export interface OrderRow {
  id: string
  member_id: string | null
  idempotency_key: string | null
  status: string
  subtotal_amount: number
  adjustment_amount: number
  total_amount: number
  currency: string
  created_at: string
  updated_at: string
}

/**
 * 資料庫中訂單明細資料列
 */
export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  sku: string
  name: string
  unit_price: number
  quantity: number
  total_price: number
  options: string | null
}

/**
 * 資料庫中訂單調整項資料列
 */
export interface OrderAdjustmentRow {
  id: string
  order_id: string
  type: string
  label: string
  amount: number
  source_type: string | null
  source_id: string | null
}

/**
 * Type guard：檢查未知值是否為 OrderRow
 */
export function isOrderRow(value: unknown): value is OrderRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' && typeof obj.status === 'string' && typeof obj.currency === 'string'
  )
}

/**
 * Type guard：檢查未知值是否為 OrderItemRow
 */
export function isOrderItemRow(value: unknown): value is OrderItemRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.product_id === 'string' &&
    typeof obj.quantity === 'number'
  )
}

/**
 * Type guard：檢查未知值是否為 OrderAdjustmentRow
 */
export function isOrderAdjustmentRow(value: unknown): value is OrderAdjustmentRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' && typeof obj.type === 'string' && typeof obj.amount === 'number'
  )
}
