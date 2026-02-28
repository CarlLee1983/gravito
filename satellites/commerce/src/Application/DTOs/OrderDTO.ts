/**
 * 訂單明細 DTO
 */
export interface OrderItemDTO {
  id: string
  productId: string
  variantId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  totalPrice: number
  options?: Record<string, string>
}

/**
 * 金額調整 DTO
 */
export interface OrderAdjustmentDTO {
  id: string
  type: string
  label: string
  amount: number
  sourceType?: string
  sourceId?: string
}

/**
 * 訂單 DTO
 *
 * 用於 API 回應和應用層通訊
 */
export interface OrderDTO {
  id: string
  memberId: string | null
  idempotencyKey?: string
  status: string
  subtotal: number
  adjustmentAmount: number
  total: number
  currency: string
  items: OrderItemDTO[]
  adjustments: OrderAdjustmentDTO[]
  createdAt: Date
  updatedAt: Date
}
