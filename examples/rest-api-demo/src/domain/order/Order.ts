/**
 * Order Domain Model
 *
 * 代表電商系統中的訂單
 */

export type OrderStatus =
  | 'pending' // 待付款
  | 'paid' // 已付款
  | 'processing' // 處理中
  | 'shipped' // 已發貨
  | 'delivered' // 已送達
  | 'cancelled' // 已取消
  | 'refunded' // 已退款

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer'

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number // 購買時的價格（分為單位）
  subtotal: number // 小計 = price * quantity
}

export interface ShippingAddress {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface Order {
  id: string
  orderNumber: string // 訂單編號（用於顯示給用戶）
  userId: string
  items: OrderItem[]
  status: OrderStatus
  subtotal: number // 商品小計（分為單位）
  shippingCost: number // 運費（分為單位）
  tax: number // 稅費（分為單位）
  total: number // 總金額（分為單位）
  shippingAddress: ShippingAddress
  paymentMethod?: PaymentMethod
  notes?: string
  trackingNumber?: string
  paidAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  cancelledAt?: Date
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrderInput {
  userId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  tax: number
  notes?: string
}

export interface UpdateOrderStatusInput {
  status: OrderStatus
  trackingNumber?: string
  paymentMethod?: PaymentMethod
}

/**
 * Order 領域服務
 */
export class OrderDomainService {
  /**
   * 生成訂單編號
   * 格式：ORD-{timestamp}-{random}
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }

  /**
   * 驗證訂單狀態轉換是否合法
   */
  static isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['paid', 'cancelled'],
      paid: ['processing', 'refunded'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    }

    return validTransitions[currentStatus]?.includes(newStatus) ?? false
  }

  /**
   * 計算訂單總額
   */
  static calculateTotal(subtotal: number, shippingCost: number, tax: number): number {
    return subtotal + shippingCost + tax
  }

  /**
   * 計算稅費（示例：10% 稅率）
   */
  static calculateTax(subtotal: number, taxRate = 0.1): number {
    return Math.round(subtotal * taxRate)
  }

  /**
   * 驗證訂單項目
   */
  static isValidOrderItem(item: OrderItem): boolean {
    return item.quantity > 0 && item.price > 0 && item.subtotal === item.price * item.quantity
  }

  /**
   * 檢查訂單是否可以取消
   */
  static canBeCancelled(order: Order): boolean {
    return ['pending', 'paid', 'processing'].includes(order.status)
  }

  /**
   * 檢查訂單是否可以退款
   */
  static canBeRefunded(order: Order): boolean {
    return ['paid', 'processing', 'shipped'].includes(order.status)
  }

  /**
   * 驗證配送地址
   */
  static isValidShippingAddress(address: ShippingAddress): boolean {
    return (
      address.name.length > 0 &&
      address.email.length > 0 &&
      address.phone.length > 0 &&
      address.address.length > 0 &&
      address.city.length > 0 &&
      address.postalCode.length > 0 &&
      address.country.length > 0
    )
  }
}
