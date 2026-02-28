/**
 * 商品 Repository 合約（Application 層 - 舊版，向後相容）
 *
 * 此介面保留用於 CacheWarmupService 等既有基礎設施服務。
 * 新程式碼應使用 Domain/Contracts/IProductRepository。
 */

/**
 * 舊版 Product 介面（用於向後相容）
 */
export interface LegacyProduct {
  id: string
  name: string
  sku: string
  description: string
  price: number
  cost: number
  stock: number
  status: string
  images: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * 商品 Repository 介面（Application 層 - 舊版）
 */
export interface IProductRepository {
  findById(id: string): Promise<LegacyProduct | null>
  findBySku(sku: string): Promise<LegacyProduct | null>
  findAll(filters?: { status?: string; page?: number; limit?: number }): Promise<{
    items: LegacyProduct[]
    total: number
    page: number
    limit: number
  }>
  create(data: Omit<LegacyProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<LegacyProduct>
  update(id: string, data: Partial<LegacyProduct>): Promise<LegacyProduct>
  updateStock(id: string, quantity: number): Promise<void>
  delete(id: string): Promise<void>
  findByIds(ids: string[]): Promise<LegacyProduct[]>
}
