/**
 * Mock Product Repository
 *
 * 測試用的商品數據源，模擬真實 Repository 行為
 * 用於快取優化測試與性能基準測試
 */

import type { PlanetCore } from '@gravito/core'
import type { IProductRepository } from '../../Application/Contracts/IProductRepository'
import { type Product, ProductStatus } from '../../Domain/Models'

/**
 * MockProductRepository
 *
 * 提供內存中的商品存儲，用於測試環境
 */
export class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()
  private readonly skuIndex: Map<string, string> = new Map() // SKU -> ID 索引

  constructor(private core?: PlanetCore) {
    this.seedProducts()
  }

  /**
   * 初始化測試數據
   *
   * 建立 10 個測試商品，足夠的庫存用於負載測試
   */
  private seedProducts(): void {
    const now = new Date()

    for (let i = 0; i < 10; i++) {
      const id = `product-${i}`
      const sku = `SKU-${String(i).padStart(3, '0')}`

      const product: Product = {
        id,
        sku,
        name: `搶購商品 ${i + 1}`,
        description: `這是搶購系統的測試商品 ${i + 1}，用於性能測試`,
        price: 99.99 + i * 10,
        cost: 50 + i * 5,
        stock: 10000, // 足夠的庫存用於測試
        status: ProductStatus.ACTIVE,
        images: [`https://example.com/images/product-${i}.jpg`],
        createdAt: now,
        updatedAt: now,
      }

      this.products.set(id, product)
      this.skuIndex.set(sku, id)
    }

    this.core?.logger.debug(`[MockProductRepository] 初始化 ${this.products.size} 個測試商品`)
  }

  /**
   * 根據 ID 查詢商品
   */
  async findById(id: string): Promise<Product | null> {
    // 模擬數據庫查詢延遲
    await this.simulateLatency()
    return this.products.get(id) || null
  }

  /**
   * 根據 SKU 查詢商品
   */
  async findBySku(sku: string): Promise<Product | null> {
    await this.simulateLatency()
    const id = this.skuIndex.get(sku)
    if (!id) return null
    return this.products.get(id) || null
  }

  /**
   * 查詢所有商品（可選過濾）
   */
  async findAll(filters?: { status?: string; page?: number; limit?: number }): Promise<{
    items: Product[]
    total: number
    page: number
    limit: number
  }> {
    await this.simulateLatency()

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const status = filters?.status

    let items = Array.from(this.products.values())

    // 按狀態過濾
    if (status) {
      items = items.filter((p) => p.status === status)
    }

    const total = items.length
    const start = (page - 1) * limit
    const end = start + limit

    return {
      items: items.slice(start, end),
      total,
      page,
      limit,
    }
  }

  /**
   * 建立商品
   */
  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await this.simulateLatency()

    const id = `product-${Date.now()}`
    const now = new Date()

    const product: Product = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.products.set(id, product)
    this.skuIndex.set(data.sku, id)

    return product
  }

  /**
   * 更新商品
   */
  async update(id: string, data: Partial<Product>): Promise<Product> {
    await this.simulateLatency()

    const existing = this.products.get(id)
    if (!existing) {
      throw new Error(`Product not found: ${id}`)
    }

    const updated: Product = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }

    // 更新 SKU 索引（如果 SKU 被修改）
    if (data.sku && data.sku !== existing.sku) {
      this.skuIndex.delete(existing.sku)
      this.skuIndex.set(data.sku, id)
    }

    this.products.set(id, updated)
    return updated
  }

  /**
   * 更新庫存
   */
  async updateStock(id: string, quantity: number): Promise<void> {
    await this.simulateLatency()

    const product = this.products.get(id)
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    product.stock += quantity
    product.updatedAt = new Date()
  }

  /**
   * 刪除商品（邏輯刪除）
   */
  async delete(id: string): Promise<void> {
    await this.simulateLatency()

    const product = this.products.get(id)
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    product.status = ProductStatus.DISCONTINUED
    product.updatedAt = new Date()
  }

  /**
   * 批量查詢商品
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    await this.simulateLatency()

    return ids.map((id) => this.products.get(id)).filter((p): p is Product => p !== undefined)
  }

  /**
   * 模擬數據庫查詢延遲（0-5ms）
   */
  private async simulateLatency(): Promise<void> {
    const delay = Math.random() * 5
    return new Promise((resolve) => setTimeout(resolve, delay))
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
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    const totalPrice = products.reduce((sum, p) => sum + p.price, 0)

    return {
      totalProducts: products.length,
      totalStock,
      averagePrice: products.length > 0 ? totalPrice / products.length : 0,
    }
  }
}
