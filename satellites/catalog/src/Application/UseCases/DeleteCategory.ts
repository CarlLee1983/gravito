import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type {
  ICategoryRepository,
  IProductRepository,
} from '../../Domain/Contracts/ICatalogRepository'
import { CategoryManagementContext } from '../../Domain/DCI/Contexts/CategoryManagementContext'
import { CatalogErrorFactory } from '../Errors/CatalogError'

export interface DeleteCategoryInput {
  id: string
}

/**
 * DeleteCategory UseCase
 * 薄殼委派模式：所有業務邏輯在 CategoryManagementContext 中
 * 前置檢查：驗證分類下無關聯商品
 */
export class DeleteCategory extends UseCase<DeleteCategoryInput, void> {
  constructor(
    private repository: ICategoryRepository,
    private productRepository: IProductRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: DeleteCategoryInput): Promise<void> {
    // 前置檢查：驗證分類下無商品
    const products = await this.productRepository.findAll({ categoryId: input.id })
    if (products.length > 0) {
      throw CatalogErrorFactory.categoryHasProducts(input.id)
    }

    // 委派至 Context 執行刪除
    const ctx = new CategoryManagementContext(this.repository, this.core)
    await ctx.deleteCategory(input.id)
  }
}
