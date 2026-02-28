import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { ProductUpdateContext } from '../../Domain/DCI/Contexts/ProductUpdateContext'
import { type ProductDTO, ProductMapper } from '../DTOs/ProductDTO'

export interface UpdateProductInput {
  id: string
  name?: Record<string, string>
  slug?: string
  description?: string
  brand?: string
  categoryIds?: string[]
}

/**
 * UpdateProduct UseCase
 * 薄殼委派模式：所有業務邏輯在 ProductUpdateContext 中
 */
export class UpdateProduct extends UseCase<UpdateProductInput, ProductDTO> {
  constructor(private repository: IProductRepository) {
    super()
  }

  async execute(input: UpdateProductInput): Promise<ProductDTO> {
    const ctx = new ProductUpdateContext(this.repository)
    const product = await ctx.updateProduct({
      id: input.id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      brand: input.brand,
      categoryIds: input.categoryIds,
    })
    return ProductMapper.toDTO(product)
  }
}
