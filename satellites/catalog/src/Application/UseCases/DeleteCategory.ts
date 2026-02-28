import { UseCase } from '@gravito/enterprise'
import type { ICategoryRepository } from '../../Domain/Contracts/ICatalogRepository'
import { CategoryManagementContext } from '../../Domain/DCI/Contexts/CategoryManagementContext'

export interface DeleteCategoryInput {
  id: string
}

/**
 * DeleteCategory UseCase
 * 薄殼委派模式：所有業務邏輯在 CategoryManagementContext 中
 */
export class DeleteCategory extends UseCase<DeleteCategoryInput, void> {
  constructor(
    private repository: ICategoryRepository,
    private core: any
  ) {
    super()
  }

  async execute(input: DeleteCategoryInput): Promise<void> {
    const ctx = new CategoryManagementContext(this.repository, this.core)
    await ctx.deleteCategory(input.id)
  }
}
