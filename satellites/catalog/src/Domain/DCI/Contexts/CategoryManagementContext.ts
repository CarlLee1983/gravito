import type { PlanetCore } from '@gravito/core'
import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { ICategoryRepository } from '../../Contracts/ICatalogRepository'
import { Category } from '../../Entities/Category'
import { I18nText } from '../../ValueObjects/I18nText'
import { Slug } from '../../ValueObjects/Slug'
import { injectCategoryManager, type UpdateCategoryData } from '../Roles/CategoryManagerRole'

/**
 * 建立分類輸入
 */
export interface CreateCategoryInput {
  name: Record<string, string>
  slug: string
  parentId?: string | null
  description?: string
  sortOrder?: number
}

/**
 * 更新分類輸入
 */
export interface UpdateCategoryInput {
  id: string
  name?: Record<string, string>
  description?: string
  sortOrder?: number
}

/**
 * 移動分類輸入
 */
export interface MoveCategoryInput {
  id: string
  newParentId: string | null
}

/**
 * 分類管理上下文協調器
 * 統整分類 CRUD 和樹狀路徑同步的完整流程
 */
export class CategoryManagementContext {
  constructor(
    private readonly categoryRepo: ICategoryRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 建立分類
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const name = I18nText.of(input.name)
    const slug = Slug.of(input.slug)
    const category = Category.create(crypto.randomUUID(), name, slug, input.parentId || null)

    if (input.description) {
      category.updateDescription(input.description)
    }
    if (input.sortOrder !== undefined) {
      category.updateSortOrder(input.sortOrder)
    }

    // 計算路徑
    if (input.parentId) {
      const parent = await this.categoryRepo.findById(input.parentId)
      if (!parent) {
        throw CatalogErrorFactory.categoryNotFound(input.parentId)
      }
      category.updatePath(parent.path)
    } else {
      category.updatePath(null)
    }

    await this.categoryRepo.save(category)
    return category
  }

  /**
   * 更新分類資訊
   */
  async updateCategory(input: UpdateCategoryInput): Promise<Category> {
    const category = await this.categoryRepo.findById(input.id)
    if (!category) {
      throw CatalogErrorFactory.categoryNotFound(input.id)
    }

    const manager = injectCategoryManager(category)
    const updateData: UpdateCategoryData = {}
    if (input.name) {
      updateData.name = I18nText.of(input.name)
    }
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    if (input.sortOrder !== undefined) {
      updateData.sortOrder = input.sortOrder
    }

    manager.updateInfo(updateData)
    await this.categoryRepo.save(category)
    return category
  }

  /**
   * 移動分類到新的父節點（含子孫路徑同步）
   */
  async moveCategory(input: MoveCategoryInput): Promise<Category> {
    const category = await this.categoryRepo.findById(input.id)
    if (!category) {
      throw CatalogErrorFactory.categoryNotFound(input.id)
    }

    // 檢查循環引用
    if (input.newParentId) {
      const newParent = await this.categoryRepo.findById(input.newParentId)
      if (!newParent) {
        throw CatalogErrorFactory.categoryNotFound(input.newParentId)
      }

      // 檢查新 parent 是否為自己的子孫
      if (newParent.path?.startsWith(category.path || '')) {
        throw CatalogErrorFactory.categoryCircularReference(category.id)
      }
    }

    // 1. 計算新路徑
    let newParentPath: string | null = null
    if (input.newParentId) {
      const parent = await this.categoryRepo.findById(input.newParentId)
      if (!parent) {
        throw CatalogErrorFactory.categoryNotFound(input.newParentId)
      }
      newParentPath = parent.path
    }

    const oldPath = category.path
    const manager = injectCategoryManager(category)
    manager.moveToParent(input.newParentId, newParentPath)
    await this.categoryRepo.save(category)

    // 2. 同步所有子孫的路徑
    if (oldPath && category.path) {
      const descendants = await this.categoryRepo.findByPathPrefix(oldPath)
      for (const descendant of descendants) {
        if (descendant.id === category.id) continue

        // 替換路徑前綴：oldPath -> category.path
        // 例如：parent1/child -> parent2/child，則 parent1/child/grandchild -> parent2/child/grandchild
        if (descendant.path?.startsWith(oldPath + '/')) {
          const suffix = descendant.path.substring(oldPath.length)
          const newPath = category.path + suffix
          descendant.setPathDirect(newPath)
          await this.categoryRepo.save(descendant)
        }
      }
    }

    await this.core.hooks.doAction('catalog:category-moved', {
      categoryId: category.id,
      newParentId: input.newParentId,
    })

    return category
  }

  /**
   * 刪除分類（需檢查是否有商品）
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepo.findById(categoryId)
    if (!category) {
      throw CatalogErrorFactory.categoryNotFound(categoryId)
    }

    // TODO: 檢查是否有商品關聯此分類
    // if (hasProducts) {
    //   throw CatalogErrorFactory.categoryHasProducts(categoryId)
    // }

    await this.categoryRepo.delete(categoryId)
  }
}
