/**
 * Mock Product Repository
 *
 * 內存中實現 ProductRepository，用於開發和測試
 * 生產環境應該使用真實的資料庫實現
 */

import type { CreateProductInput, Product, UpdateProductInput } from '@domain/product/Product'
import type { ProductRepository } from './ProductRepository'

export class MockProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map()
  private nextId = 1

  constructor(initialProducts?: Product[]) {
    if (initialProducts) {
      initialProducts.forEach((product) => {
        this.products.set(product.id, product)
      })
      // 找出最大 ID 以確保不會重複
      const maxId = Math.max(
        ...Array.from(this.products.keys()).map((id) => {
          const match = id.match(/\d+$/)
          return match ? parseInt(match[0], 10) : 0
        })
      )
      this.nextId = maxId + 1
    }
  }

  /**
   * 根據 ID 獲取商品
   */
  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null
  }

  /**
   * 根據 SKU 獲取商品
   */
  async findBySku(sku: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.sku === sku) {
        return product
      }
    }
    return null
  }

  /**
   * 根據分類 ID 獲取商品列表（分頁）
   */
  async findByCategory(
    categoryId: string,
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }> {
    const filtered = Array.from(this.products.values()).filter((p) => p.categoryId === categoryId)
    const total = filtered.length
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return { data, total, page, limit }
  }

  /**
   * 搜索商品
   */
  async search(
    query: string,
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }> {
    const lowerQuery = query.toLowerCase()
    const filtered = Array.from(this.products.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery)
    )
    const total = filtered.length
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return { data, total, page, limit }
  }

  /**
   * 獲取所有商品（分頁）
   */
  async findAll(
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }> {
    const all = Array.from(this.products.values())
    const total = all.length
    const start = (page - 1) * limit
    const data = all.slice(start, start + limit)

    return { data, total, page, limit }
  }

  /**
   * 創建新商品
   */
  async create(input: CreateProductInput): Promise<Product> {
    const id = `product_${this.nextId++}`
    const now = new Date()

    const product: Product = {
      id,
      ...input,
      status: 'active',
      rating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.products.set(id, product)
    return product
  }

  /**
   * 更新商品
   */
  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const product = this.products.get(id)
    if (!product) {
      return null
    }

    const updated: Product = {
      ...product,
      ...input,
      id: product.id, // 保持 ID 不變
      createdAt: product.createdAt, // 保持創建時間
      updatedAt: new Date(),
    }

    this.products.set(id, updated)
    return updated
  }

  /**
   * 刪除商品
   */
  async delete(id: string): Promise<boolean> {
    return this.products.delete(id)
  }

  /**
   * 檢查 SKU 是否已存在
   */
  async existsBySku(sku: string): Promise<boolean> {
    for (const product of this.products.values()) {
      if (product.sku === sku) {
        return true
      }
    }
    return false
  }

  /**
   * 獲取商品總數
   */
  async count(): Promise<number> {
    return this.products.size
  }

  /**
   * 減少庫存
   */
  async decreaseStock(id: string, quantity: number): Promise<boolean> {
    const product = this.products.get(id)
    if (!product) {
      return false
    }

    if (product.stock < quantity) {
      return false
    }

    const updated: Product = {
      ...product,
      stock: product.stock - quantity,
      updatedAt: new Date(),
    }

    this.products.set(id, updated)
    return true
  }

  /**
   * 增加庫存
   */
  async increaseStock(id: string, quantity: number): Promise<boolean> {
    const product = this.products.get(id)
    if (!product) {
      return false
    }

    const updated: Product = {
      ...product,
      stock: product.stock + quantity,
      updatedAt: new Date(),
    }

    this.products.set(id, updated)
    return true
  }

  /**
   * 獲取庫存
   */
  async getStock(id: string): Promise<number | null> {
    const product = this.products.get(id)
    return product ? product.stock : null
  }

  /**
   * 更新評分
   */
  async updateRating(id: string, rating: number, ratingCount: number): Promise<void> {
    const product = this.products.get(id)
    if (product) {
      const updated: Product = {
        ...product,
        rating,
        ratingCount,
        updatedAt: new Date(),
      }
      this.products.set(id, updated)
    }
  }

  /**
   * 獲取熱門商品（按評分排序）
   */
  async findPopular(limit: number): Promise<Product[]> {
    return Array.from(this.products.values())
      .sort((a, b) => b.ratingCount * b.rating - a.ratingCount * a.rating)
      .slice(0, limit)
  }

  /**
   * 獲取最新商品（按創建時間排序）
   */
  async findLatest(limit: number): Promise<Product[]> {
    return Array.from(this.products.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * 初始化測試商品
   */
  seedTestProducts(): void {
    const testProducts: CreateProductInput[] = [
      {
        sku: 'LAPTOP-001',
        name: 'MacBook Pro 14"',
        description: '高性能筆記本電腦，搭載 M3 Pro 芯片',
        categoryId: 'cat_001',
        price: 189900,
        originalPrice: 199900,
        stock: 50,
        imageUrl: 'https://via.placeholder.com/300?text=MacBook+Pro',
        tags: ['laptop', 'apple', 'professional'],
      },
      {
        sku: 'LAPTOP-002',
        name: 'Dell XPS 15',
        description: '設計師和開發者首選的 Windows 筆記本',
        categoryId: 'cat_001',
        price: 149900,
        originalPrice: 159900,
        stock: 30,
        imageUrl: 'https://via.placeholder.com/300?text=Dell+XPS',
        tags: ['laptop', 'dell', 'windows'],
      },
      {
        sku: 'PHONE-001',
        name: 'iPhone 15 Pro',
        description: '最新款蘋果旗艦智能手機',
        categoryId: 'cat_002',
        price: 79900,
        originalPrice: 89900,
        stock: 100,
        imageUrl: 'https://via.placeholder.com/300?text=iPhone+15',
        tags: ['phone', 'apple', 'mobile'],
      },
      {
        sku: 'PHONE-002',
        name: 'Samsung Galaxy S24',
        description: '安卓旗艦機型，配備先進相機系統',
        categoryId: 'cat_002',
        price: 69900,
        originalPrice: 79900,
        stock: 80,
        imageUrl: 'https://via.placeholder.com/300?text=Galaxy+S24',
        tags: ['phone', 'samsung', 'android'],
      },
      {
        sku: 'WATCH-001',
        name: 'Apple Watch Series 9',
        description: '功能豐富的智能手錶',
        categoryId: 'cat_003',
        price: 29900,
        stock: 45,
        imageUrl: 'https://via.placeholder.com/300?text=Apple+Watch',
        tags: ['watch', 'wearable', 'apple'],
      },
      {
        sku: 'HEADPHONE-001',
        name: 'Sony WH-1000XM5',
        description: '業界領先的降噪耳機',
        categoryId: 'cat_004',
        price: 39900,
        stock: 60,
        imageUrl: 'https://via.placeholder.com/300?text=Sony+Headphone',
        tags: ['headphone', 'audio', 'sony'],
      },
      {
        sku: 'TABLET-001',
        name: 'iPad Pro 12.9"',
        description: '強大的創意工具',
        categoryId: 'cat_005',
        price: 59900,
        stock: 35,
        imageUrl: 'https://via.placeholder.com/300?text=iPad+Pro',
        tags: ['tablet', 'apple', 'creative'],
      },
      {
        sku: 'CAMERA-001',
        name: 'Canon EOS R6',
        description: '專業級全幀無反相機',
        categoryId: 'cat_006',
        price: 149900,
        stock: 15,
        imageUrl: 'https://via.placeholder.com/300?text=Canon+R6',
        tags: ['camera', 'professional', 'canon'],
      },
      {
        sku: 'MONITOR-001',
        name: 'Dell UltraSharp U2723DE',
        description: '27 英寸 4K 專業顯示器',
        categoryId: 'cat_007',
        price: 49900,
        stock: 25,
        imageUrl: 'https://via.placeholder.com/300?text=Dell+Monitor',
        tags: ['monitor', 'display', 'dell'],
      },
      {
        sku: 'KEYBOARD-001',
        name: 'Keychron K8 Pro',
        description: '無線機械鍵盤，支持多設備',
        categoryId: 'cat_008',
        price: 12900,
        stock: 120,
        imageUrl: 'https://via.placeholder.com/300?text=Keychron+K8',
        tags: ['keyboard', 'mechanical', 'wireless'],
      },
    ]

    testProducts.forEach((input) => {
      const id = `product_${this.nextId++}`
      const now = new Date()

      const product: Product = {
        id,
        ...input,
        status: 'active',
        rating: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      }

      this.products.set(id, product)
    })
  }
}
