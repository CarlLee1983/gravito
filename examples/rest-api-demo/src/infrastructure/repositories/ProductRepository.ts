/**
 * Product Repository Contract
 *
 * 定義商品資料訪問的介面
 */

import type { CreateProductInput, Product, UpdateProductInput } from '@domain/product/Product'

export interface ProductRepository {
  /**
   * 根據 ID 獲取商品
   */
  findById(id: string): Promise<Product | null>

  /**
   * 根據 SKU 獲取商品
   */
  findBySku(sku: string): Promise<Product | null>

  /**
   * 根據分類 ID 獲取商品列表（分頁）
   */
  findByCategory(
    categoryId: string,
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 搜索商品
   */
  search(
    query: string,
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 獲取所有商品（分頁）
   */
  findAll(
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 創建新商品
   */
  create(input: CreateProductInput): Promise<Product>

  /**
   * 更新商品
   */
  update(id: string, input: UpdateProductInput): Promise<Product | null>

  /**
   * 刪除商品
   */
  delete(id: string): Promise<boolean>

  /**
   * 檢查 SKU 是否已存在
   */
  existsBySku(sku: string): Promise<boolean>

  /**
   * 獲取商品總數
   */
  count(): Promise<number>

  /**
   * 減少庫存
   */
  decreaseStock(id: string, quantity: number): Promise<boolean>

  /**
   * 增加庫存
   */
  increaseStock(id: string, quantity: number): Promise<boolean>

  /**
   * 獲取庫存
   */
  getStock(id: string): Promise<number | null>

  /**
   * 更新評分
   */
  updateRating(id: string, rating: number, ratingCount: number): Promise<void>

  /**
   * 獲取熱門商品
   */
  findPopular(limit: number): Promise<Product[]>

  /**
   * 獲取最新商品
   */
  findLatest(limit: number): Promise<Product[]>
}
