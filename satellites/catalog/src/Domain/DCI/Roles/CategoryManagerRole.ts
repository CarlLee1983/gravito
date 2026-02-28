import type { Category } from '../../Entities/Category'
import type { I18nText } from '../../ValueObjects/I18nText'

/**
 * 分類管理資訊
 */
export interface UpdateCategoryData {
  name?: I18nText
  description?: string
  sortOrder?: number
}

/**
 * 分類管理者角色
 * 提供分類資訊編輯、移動、路徑計算的行為契約
 */
export interface CategoryManager {
  /**
   * 更新分類資訊
   */
  updateInfo(data: UpdateCategoryData): void

  /**
   * 移動分類到新的父節點
   */
  moveToParent(newParentId: string | null, parentPath: string | null): void

  /**
   * 計算並設定路徑
   */
  computeAndSetPath(parentPath: string | null): void
}

/**
 * 將分類管理者角色注入到 Category 實體中
 */
export function injectCategoryManager(category: Category): CategoryManager {
  return {
    updateInfo(data: UpdateCategoryData): void {
      if (data.name) {
        category.updateName(data.name)
      }
      if (data.description !== undefined) {
        category.updateDescription(data.description)
      }
      if (data.sortOrder !== undefined) {
        category.updateSortOrder(data.sortOrder)
      }
    },

    moveToParent(newParentId: string | null, parentPath: string | null): void {
      category.moveTo(newParentId)
      category.updatePath(parentPath)
    },

    computeAndSetPath(parentPath: string | null): void {
      category.updatePath(parentPath)
    },
  }
}
