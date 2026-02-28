import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { CategoryManagementContext } from '../../Domain/DCI/Contexts/CategoryManagementContext'
import { type CategoryDTO, CategoryMapper } from '../DTOs/CategoryDTO'

export interface CreateCategoryInput {
  name: Record<string, string>
  slug: string
  parentId?: string | null
  description?: string
  sortOrder?: number
}

/**
 * CreateCategory UseCase
 * 薄殼委派模式：所有業務邏輯在 CategoryManagementContext 中
 */
export class CreateCategory extends UseCase<CreateCategoryInput, CategoryDTO> {
  constructor(
    private repository: ICategoryRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: CreateCategoryInput): Promise<CategoryDTO> {
    const ctx = new CategoryManagementContext(this.repository, this.core)
    const category = await ctx.createCategory({
      name: input.name,
      slug: input.slug,
      parentId: input.parentId,
      description: input.description,
      sortOrder: input.sortOrder,
    })
    return CategoryMapper.toDTO(category)
  }
}
