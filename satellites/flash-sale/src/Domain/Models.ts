/**
 * 商品領域模型
 */

/**
 * 商品狀態
 */
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
}

/**
 * 商品模型
 */
export interface Product {
  id: string
  name: string
  sku: string
  description: string
  price: number
  cost: number // 成本價（用於計算利潤）
  stock: number // 當前庫存
  status: ProductStatus
  images: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * 訂單狀態
 */
export enum OrderStatus {
  PENDING = 'PENDING', // 待支付
  PAID = 'PAID', // 已支付
  CONFIRMED = 'CONFIRMED', // 已確認
  SHIPPED = 'SHIPPED', // 已發貨
  DELIVERED = 'DELIVERED', // 已送達
  CANCELLED = 'CANCELLED', // 已取消
  REFUNDED = 'REFUNDED', // 已退款
}

/**
 * 訂單項目
 */
export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

/**
 * 訂單模型
 */
export interface Order {
  id: string
  userId: string
  status: OrderStatus
  items: OrderItem[]
  totalAmount: number
  paymentMethod?: string
  paymentId?: string // 支付服務的交易 ID
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  confirmedAt?: Date
}

/**
 * 建立訂單請求
 */
export class CreateOrderRequest {
  constructor(
    public userId: string,
    public productId: string,
    public quantity: number
  ) {}

  /**
   * 驗證請求
   */
  validate(): string[] {
    const errors: string[] = []

    if (!this.userId?.trim()) {
      errors.push('userId is required')
    }

    if (!this.productId?.trim()) {
      errors.push('productId is required')
    }

    if (this.quantity <= 0) {
      errors.push('quantity must be greater than 0')
    }

    if (this.quantity > 1000) {
      errors.push('quantity cannot exceed 1000')
    }

    return errors
  }
}

/**
 * 建立商品請求
 */
export class CreateProductRequest {
  constructor(
    public name: string,
    public sku: string,
    public description: string,
    public price: number,
    public cost: number,
    public stock: number,
    public images: string[] = []
  ) {}

  /**
   * 驗證請求
   */
  validate(): string[] {
    const errors: string[] = []

    if (!this.name?.trim()) {
      errors.push('name is required')
    }

    if (!this.sku?.trim()) {
      errors.push('sku is required')
    }

    if (this.price <= 0) {
      errors.push('price must be greater than 0')
    }

    if (this.cost < 0) {
      errors.push('cost cannot be negative')
    }

    if (this.stock < 0) {
      errors.push('stock cannot be negative')
    }

    return errors
  }
}
