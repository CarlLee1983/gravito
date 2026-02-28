import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { ProductCreationContext } from '../../Domain/DCI/Contexts/ProductCreationContext'
import { type ProductDTO, ProductMapper } from '../DTOs/ProductDTO'

export interface CreateProductInput {
  name: Record<string, string>
  slug: string
  brand?: string
  description?: string
  categoryIds?: string[]
  variants: {
    sku: string
    name?: string
    price: number
    compareAtPrice?: number
    stock: number
    options: Record<string, string>
  }[]
}

/**
 * 建立商品 UseCase
 * 薄殼委派模式：所有業務邏輯在 ProductCreationContext 中
 */
export class CreateProduct extends UseCase<CreateProductInput, ProductDTO> {
  constructor(
    private repository: IProductRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: CreateProductInput): Promise<ProductDTO> {
    const ctx = new ProductCreationContext(this.repository, this.core)
    const product = await ctx.execute(input)
    return ProductMapper.toDTO(product)
  }
}
