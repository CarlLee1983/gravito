/**
 * Product Domain Model
 *
 * 代表電商系統中的商品
 */

export type ProductStatus = 'draft' | 'active' | 'archived' | 'discontinued'

export interface Product {
  id: string
  sku: string // 庫存單位，唯一標識商品
  name: string
  description: string
  categoryId: string
  price: number // 以分為單位，例如 1099 表示 $10.99
  originalPrice?: number // 原價（用於顯示折扣）
  stock: number // 庫存數量
  status: ProductStatus
  imageUrl?: string
  imageUrls?: string[]
  rating: number // 平均評分 0-5
  ratingCount: number // 評分數量
  seoTitle?: string
  seoDescription?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateProductInput {
  sku: string
  name: string
  description: string
  categoryId: string
  price: number
  originalPrice?: number
  stock: number
  imageUrl?: string
  imageUrls?: string[]
  seoTitle?: string
  seoDescription?: string
  tags?: string[]
}

export interface UpdateProductInput {
  name?: string
  description?: string
  categoryId?: string
  price?: number
  originalPrice?: number
  stock?: number
  status?: ProductStatus
  imageUrl?: string
  imageUrls?: string[]
  seoTitle?: string
  seoDescription?: string
  tags?: string[]
}

/**
 * Product 領域服務
 */
export class ProductDomainService {
  /**
   * 驗證 SKU
   */
  static isValidSku(sku: string): boolean {
    return sku.length > 0 && sku.length <= 50 && /^[A-Z0-9-]+$/.test(sku)
  }

  /**
   * 驗證商品名稱
   */
  static isValidName(name: string): boolean {
    return name.length > 0 && name.length <= 200
  }

  /**
   * 驗證價格（分為單位）
   */
  static isValidPrice(price: number): boolean {
    return price > 0 && Number.isInteger(price)
  }

  /**
   * 驗證庫存
   */
  static isValidStock(stock: number): boolean {
    return stock >= 0 && Number.isInteger(stock)
  }

  /**
   * 計算折扣百分比
   */
  static calculateDiscountPercentage(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price) {
      return 0
    }
    return Math.round(((originalPrice - price) / originalPrice) * 100)
  }

  /**
   * 檢查商品是否缺貨
   */
  static isOutOfStock(product: Product): boolean {
    return product.stock <= 0
  }

  /**
   * 檢查商品是否可購買
   */
  static isAvailable(product: Product): boolean {
    return product.status === 'active' && product.stock > 0
  }

  /**
   * 驗證評分（0-5）
   */
  static isValidRating(rating: number): boolean {
    return rating >= 0 && rating <= 5
  }
}
