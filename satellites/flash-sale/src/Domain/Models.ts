/**
 * 搶購系統領域模型 - 列舉定義
 *
 * 注意：舊版的 interface（Product, Order, OrderItem）和 class（CreateOrderRequest, CreateProductRequest）
 * 已遷移至 Domain/Entities、Domain/ValueObjects 和 Application/DTOs。
 * 此檔案僅保留列舉值，供整個系統參照。
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
 * 訂單狀態
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
