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
 * DCI 模式：包含分類編輯、移動、路徑計算的業務邏輯
 */
export interface CategoryManager {
  /**
   * 更新分類資訊
   */
  updateInfo(data: UpdateCategoryData): void

  /**
   * 移動分類到新的父節點（自動計算路徑）
   */
  moveToParent(newParentId: string | null, parentPath: string | null): void

  /**
   * 計算並設定路徑（基於父分類的路徑和自己的 slug）
   */
  computeAndSetPath(parentPath: string | null): void
}

/**
 * 將分類管理者角色注入到 Category 實體中
 * DCI 模式：Role 包含業務邏輯，Entity 只提供 setter
 */
export function injectCategoryManager(category: Category): CategoryManager {
  return {
    updateInfo(data: UpdateCategoryData): void {
      if (data.name) {
        category.setName(data.name)
      }
      if (data.description !== undefined) {
        category.setDescription(data.description)
      }
      if (data.sortOrder !== undefined) {
        category.setSortOrder(data.sortOrder)
      }
    },

    moveToParent(newParentId: string | null, parentPath: string | null): void {
      // 變更父分類
      category.setParentId(newParentId)
      // 計算並設定新路徑
      const computedPath = parentPath ? `${parentPath}/${category.slug.value}` : category.slug.value
      category.setPath(computedPath)
    },

    computeAndSetPath(parentPath: string | null): void {
      // 基於父分類路徑和自己的 slug 計算路徑
      const computedPath = parentPath ? `${parentPath}/${category.slug.value}` : category.slug.value
      category.setPath(computedPath)
    },
  }
}
