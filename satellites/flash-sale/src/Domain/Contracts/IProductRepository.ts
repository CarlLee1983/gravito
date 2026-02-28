/**
 * 商品 Repository 合約（Domain Layer）
 *
 * 繼承 @gravito/enterprise 的 Repository 基礎介面，
 * 並擴展搶購系統特有的查詢和庫存更新方法。
 */

import type { Repository } from '@gravito/enterprise'
import type { Product } from '../Entities/Product'
import type { Stock } from '../ValueObjects/Stock'

/**
 * IProductRepository
 *
 * 商品實體的持久化合約
 */
export interface IProductRepository extends Repository<Product, string> {
  /**
   * 根據 SKU 查詢商品
   *
   * @param sku - 商品 SKU 編碼
   * @returns 匹配的商品或 null
   */
  findBySku(sku: string): Promise<Product | null>

  /**
   * 批量根據 ID 查詢商品
   *
   * @param ids - 商品 ID 列表
   * @returns 匹配的商品列表
   */
  findByIds(ids: string[]): Promise<Product[]>

  /**
   * 更新商品庫存
   *
   * @param productId - 商品 ID
   * @param newStock - 新的庫存值物件
   */
  updateStock(productId: string, newStock: Stock): Promise<void>
}
