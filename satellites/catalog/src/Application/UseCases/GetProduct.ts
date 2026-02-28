import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { ProductQueryContext } from '../../Domain/DCI/Contexts/ProductQueryContext'
import { type ProductDTO, ProductMapper } from '../DTOs/ProductDTO'
import { CatalogErrorFactory } from '../Errors/CatalogError'

export interface GetProductInput {
  id: string
}

/**
 * GetProduct UseCase
 * 薄殼委派模式：所有業務邏輯在 ProductQueryContext 中
 */
export class GetProduct extends UseCase<GetProductInput, ProductDTO> {
  constructor(private repository: IProductRepository) {
    super()
  }

  async execute(input: GetProductInput): Promise<ProductDTO> {
    const ctx = new ProductQueryContext(this.repository)
    const product = await ctx.getProduct(input.id)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(input.id)
    }
    return ProductMapper.toDTO(product)
  }
}
