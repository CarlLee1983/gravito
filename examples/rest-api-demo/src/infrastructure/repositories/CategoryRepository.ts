/**
 * Category Repository Contract
 *
 * 定義分類資料訪問的介面
 */

import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@domain/product/Category'

export interface CategoryRepository {
  /**
   * 根據 ID 獲取分類
   */
  findById(id: string): Promise<Category | null>

  /**
   * 獲取所有分類
   */
  findAll(): Promise<Category[]>

  /**
   * 獲取子分類
   */
  findByParentId(parentId: string | null): Promise<Category[]>

  /**
   * 創建新分類
   */
  create(input: CreateCategoryInput): Promise<Category>

  /**
   * 更新分類
   */
  update(id: string, input: UpdateCategoryInput): Promise<Category | null>

  /**
   * 刪除分類
   */
  delete(id: string): Promise<boolean>

  /**
   * 檢查分類是否有子分類
   */
  hasChildren(id: string): Promise<boolean>

  /**
   * 獲取分類層級結構
   */
  getHierarchy(): Promise<(Category & { children?: Category[] })[]>

  /**
   * 按名稱搜索分類
   */
  searchByName(name: string): Promise<Category[]>
}
