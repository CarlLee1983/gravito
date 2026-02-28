/**
 * Mock Product Repository
 *
 * 測試用的商品數據源，返回 Product Entity。
 * 內部以 Product Entity 儲存，實現 Domain 層的 IProductRepository 合約。
 */

import type { PlanetCore } from '@gravito/core'
import type { IProductRepository } from '../../Domain/Contracts/IProductRepository'
import { Product } from '../../Domain/Entities/Product'
import { Money } from '../../Domain/ValueObjects/Money'
import type { Stock as StockType } from '../../Domain/ValueObjects/Stock'
import { Stock } from '../../Domain/ValueObjects/Stock'

/**
 * MockProductRepository
 *
 * 提供內存中的商品存儲，用於測試環境。
 * 實現 Domain 層 IProductRepository（基於 Repository<Product, string>）。
 */
export class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()
  private readonly skuIndex: Map<string, string> = new Map()

  constructor(private core?: PlanetCore) {
    this.seedProducts()
  }

  /**
   * 初始化測試數據
   *
   * 建立 10 個測試商品 Entity，足夠的庫存用於負載測試
   */
  private seedProducts(): void {
    for (let i = 0; i < 10; i++) {
      const id = `product-${i}`
      const sku = `SKU-${String(i).padStart(3, '0')}`

      const product = Product.create(
        id,
        `搶購商品 ${i + 1}`,
        sku,
        `這是搶購系統的測試商品 ${i + 1}，用於性能測試`,
        Money.of(99.99 + i * 10),
        Money.of(50 + i * 5),
        Stock.of(10000),
        [`https://example.com/images/product-${i}.jpg`]
      )

      this.products.set(id, product)
      this.skuIndex.set(sku, id)
    }

    this.core?.logger.debug(`[MockProductRepository] 初始化 ${this.products.size} 個測試商品`)
  }

  /**
   * 保存 Product Entity
   */
  async save(entity: Product): Promise<void> {
    this.products.set(entity.id, entity)
    this.skuIndex.set(entity.sku, entity.id)
  }

  /**
   * 根據 ID 查詢商品，返回 Product Entity
   */
  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }

  /**
   * 查詢所有商品，返回 Product Entity 陣列
   */
  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values())
  }

  /**
   * 刪除商品
   */
  async delete(id: string): Promise<void> {
    const product = this.products.get(id)
    if (product) {
      this.skuIndex.delete(product.sku)
      this.products.delete(id)
    }
  }

  /**
   * 檢查商品是否存在
   */
  async exists(id: string): Promise<boolean> {
    return this.products.has(id)
  }

  /**
   * 根據 SKU 查詢商品，返回 Product Entity
   */
  async findBySku(sku: string): Promise<Product | null> {
    const id = this.skuIndex.get(sku)
    if (!id) {
      return null
    }
    return this.products.get(id) ?? null
  }

  /**
   * 批量根據 ID 查詢商品，返回 Product Entity 陣列
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    return ids.map((id) => this.products.get(id)).filter((p): p is Product => p !== undefined)
  }

  /**
   * 更新商品庫存
   */
  async updateStock(productId: string, newStock: StockType): Promise<void> {
    const product = this.products.get(productId)
    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // 重建 Product Entity，使用新的 Stock
    const updated = Product.reconstitute(product.id, {
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      cost: product.cost,
      stock: newStock,
      images: product.images,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: new Date(),
    })

    this.products.set(productId, updated)
  }

  /**
   * 清空所有數據（用於測試重置）
   */
  async reset(): Promise<void> {
    this.products.clear()
    this.skuIndex.clear()
    this.seedProducts()
  }

  /**
   * 取得統計資訊
   */
  getStats(): {
    totalProducts: number
    totalStock: number
    averagePrice: number
  } {
    const products = Array.from(this.products.values())
    const totalStock = products.reduce((sum, p) => sum + p.stock.quantity, 0)
    const totalPrice = products.reduce((sum, p) => sum + p.price.value, 0)

    return {
      totalProducts: products.length,
      totalStock,
      averagePrice: products.length > 0 ? totalPrice / products.length : 0,
    }
  }
}
