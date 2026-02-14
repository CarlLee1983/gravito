/**
 * Category Domain Model
 *
 * 商品分類
 */

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  parentId?: string // 用於支持分類層級
  order: number // 排序字段
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateCategoryInput {
  name: string
  description?: string
  icon?: string
  parentId?: string
  order?: number
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  icon?: string
  parentId?: string
  order?: number
  isActive?: boolean
}

/**
 * Category 領域服務
 */
export class CategoryDomainService {
  /**
   * 驗證分類名稱
   */
  static isValidName(name: string): boolean {
    return name.length > 0 && name.length <= 100
  }

  /**
   * 驗證分類描述
   */
  static isValidDescription(description: string): boolean {
    return description.length <= 500
  }

  /**
   * 驗證排序值
   */
  static isValidOrder(order: number): boolean {
    return order >= 0 && order <= 9999
  }
}
