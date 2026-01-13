import { column, Model } from '@gravito/atlas'

/**
 * Order Status Enum
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Order Model
 *
 * Represents a customer order.
 */
export class Order extends Model {
  static table = 'orders'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get user_id(): number {
    return this._attributes.user_id as number
  }
  set user_id(value: number) {
    this._setAttribute('user_id', value)
  }

  /**
   * Unique order number (e.g., ORD-20240101-0001)
   */
  @column()
  get order_number(): string {
    return this._attributes.order_number as string
  }
  set order_number(value: string) {
    this._setAttribute('order_number', value)
  }

  @column()
  get status(): OrderStatus {
    return this._attributes.status as OrderStatus
  }
  set status(value: OrderStatus) {
    this._setAttribute('status', value)
  }

  /**
   * Subtotal (in smallest currency unit)
   */
  @column()
  get subtotal(): number {
    return this._attributes.subtotal as number
  }
  set subtotal(value: number) {
    this._setAttribute('subtotal', value)
  }

  /**
   * Tax amount (in smallest currency unit)
   */
  @column()
  get tax(): number {
    return (this._attributes.tax as number) || 0
  }
  set tax(value: number) {
    this._setAttribute('tax', value)
  }

  /**
   * Shipping cost (in smallest currency unit)
   */
  @column()
  get shipping(): number {
    return (this._attributes.shipping as number) || 0
  }
  set shipping(value: number) {
    this._setAttribute('shipping', value)
  }

  /**
   * Total amount (in smallest currency unit)
   */
  @column()
  get total(): number {
    return this._attributes.total as number
  }
  set total(value: number) {
    this._setAttribute('total', value)
  }

  /**
   * Shipping address (JSON string)
   */
  @column()
  get shipping_address(): string | null {
    return (this._attributes.shipping_address as string) || null
  }
  set shipping_address(value: string | null) {
    this._setAttribute('shipping_address', value)
  }

  /**
   * Stripe Checkout Session ID
   */
  @column()
  get stripe_session_id(): string | null {
    return (this._attributes.stripe_session_id as string) || null
  }
  set stripe_session_id(value: string | null) {
    this._setAttribute('stripe_session_id', value)
  }

  /**
   * Stripe Payment Intent ID
   */
  @column()
  get stripe_payment_intent_id(): string | null {
    return (this._attributes.stripe_payment_intent_id as string) || null
  }
  set stripe_payment_intent_id(value: string | null) {
    this._setAttribute('stripe_payment_intent_id', value)
  }

  @column()
  get notes(): string | null {
    return (this._attributes.notes as string) || null
  }
  set notes(value: string | null) {
    this._setAttribute('notes', value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get updated_at(): Date {
    return new Date(this._attributes.updated_at as string | number | Date)
  }
  set updated_at(value: Date | string) {
    this._setAttribute('updated_at', value instanceof Date ? value.toISOString() : value)
  }

  // ─────────────────────────────────────────────────────────────
  // Relationship Data (loaded via service)
  // ─────────────────────────────────────────────────────────────

  items?: OrderItem[]
  user?: { id: number; name: string; email: string }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Get parsed shipping address
   */
  getShippingAddress(): ShippingAddress | null {
    if (!this.shipping_address) return null
    try {
      return JSON.parse(this.shipping_address)
    } catch {
      return null
    }
  }

  /**
   * Get formatted total
   */
  getFormattedTotal(): string {
    return `NT$ ${(this.total / 100).toLocaleString()}`
  }

  /**
   * Get status label (Chinese)
   */
  getStatusLabel(): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '待付款',
      [OrderStatus.PAID]: '已付款',
      [OrderStatus.PROCESSING]: '處理中',
      [OrderStatus.SHIPPED]: '已出貨',
      [OrderStatus.DELIVERED]: '已送達',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.REFUNDED]: '已退款',
    }
    return labels[this.status] || this.status
  }

  /**
   * Check if order can be cancelled
   */
  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.PAID].includes(this.status)
  }

  /**
   * Generate order number
   */
  static generateOrderNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `ORD-${dateStr}-${random}`
  }
}

/**
 * OrderItem Model
 *
 * Individual item in an order.
 */
export class OrderItem extends Model {
  static table = 'order_items'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get order_id(): number {
    return this._attributes.order_id as number
  }
  set order_id(value: number) {
    this._setAttribute('order_id', value)
  }

  @column()
  get product_id(): number {
    return this._attributes.product_id as number
  }
  set product_id(value: number) {
    this._setAttribute('product_id', value)
  }

  /**
   * Product name at time of order
   */
  @column()
  get product_name(): string {
    return this._attributes.product_name as string
  }
  set product_name(value: string) {
    this._setAttribute('product_name', value)
  }

  @column()
  get quantity(): number {
    return this._attributes.quantity as number
  }
  set quantity(value: number) {
    this._setAttribute('quantity', value)
  }

  /**
   * Price at time of order (in smallest currency unit)
   */
  @column()
  get price(): number {
    return this._attributes.price as number
  }
  set price(value: number) {
    this._setAttribute('price', value)
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Get line total
   */
  getLineTotal(): number {
    return this.price * this.quantity
  }
}

/**
 * Shipping Address Type
 */
export interface ShippingAddress {
  name: string
  phone: string
  address: string
  city: string
  postal_code: string
  country?: string
}
