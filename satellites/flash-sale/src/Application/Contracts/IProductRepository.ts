/**
 * 商品 Repository 合約
 */

import type { Product } from '../../Domain/Models'

/**
 * 商品 Repository 介面
 */
export interface IProductRepository {
  /**
   * 根據 ID 查詢商品
   */
  findById(id: string): Promise<Product | null>

  /**
   * 根據 SKU 查詢商品
   */
  findBySku(sku: string): Promise<Product | null>

  /**
   * 查詢所有商品（可選過濾）
   */
  findAll(filters?: { status?: string; page?: number; limit?: number }): Promise<{
    items: Product[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 建立商品
   */
  create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>

  /**
   * 更新商品
   */
  update(id: string, data: Partial<Product>): Promise<Product>

  /**
   * 更新庫存
   */
  updateStock(id: string, quantity: number): Promise<void>

  /**
   * 刪除商品（邏輯刪除）
   */
  delete(id: string): Promise<void>

  /**
   * 批量查詢商品
   */
  findByIds(ids: string[]): Promise<Product[]>
}
