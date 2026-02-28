import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { CategoryManagementContext } from '../../Domain/DCI/Contexts/CategoryManagementContext'
import { type CategoryDTO, CategoryMapper } from '../DTOs/CategoryDTO'

export interface UpdateCategoryInput {
  id: string
  name?: Record<string, string>
  description?: string
  sortOrder?: number
  parentId?: string | null
}

/**
 * UpdateCategory UseCase
 * 薄殼委派模式：所有業務邏輯在 CategoryManagementContext 中
 */
export class UpdateCategory extends UseCase<UpdateCategoryInput, CategoryDTO> {
  constructor(
    private repository: ICategoryRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: UpdateCategoryInput): Promise<CategoryDTO> {
    const ctx = new CategoryManagementContext(this.repository, this.core)

    // 檢查是否需要移動分類
    if (input.parentId !== undefined) {
      const category = await ctx.moveCategory({
        id: input.id,
        newParentId: input.parentId,
      })

      // 如果同時有其他屬性更新，需要額外更新
      if (input.name || input.description !== undefined || input.sortOrder !== undefined) {
        const updated = await ctx.updateCategory({
          id: input.id,
          name: input.name,
          description: input.description,
          sortOrder: input.sortOrder,
        })
        return CategoryMapper.toDTO(updated)
      }

      return CategoryMapper.toDTO(category)
    }

    // 只更新屬性，不移動
    const category = await ctx.updateCategory({
      id: input.id,
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder,
    })

    return CategoryMapper.toDTO(category)
  }
}
