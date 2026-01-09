import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IProductRepository } from '../../Domain/Contracts/ICatalogRepository'
import { Product, Variant } from '../../Domain/Entities/Product'
import { type ProductDTO, ProductMapper } from '../DTOs/ProductDTO'

export interface CreateProductInput {
  name: Record<string, string>
  slug: string
  brand?: string
  categoryIds?: string[]
  variants: {
    sku: string
    name?: string
    price: number
    stock: number
    options: Record<string, string>
  }[]
}

export class CreateProduct extends UseCase<CreateProductInput, ProductDTO> {
  constructor(
    private repository: IProductRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: CreateProductInput): Promise<ProductDTO> {
    // 1. 建立 Product 主體
    const product = Product.create(crypto.randomUUID(), input.name, input.slug)

    // @ts-expect-error
    product.props.brand = input.brand

    // 2. 加入分類
    if (input.categoryIds) {
      input.categoryIds.forEach((cid) => {
        product.assignToCategory(cid)
      })
    }

    // 3. 建立變體 (SKUs)
    input.variants.forEach((v) => {
      const variant = new Variant(crypto.randomUUID(), {
        productId: product.id,
        sku: v.sku,
        name: v.name || null,
        price: v.price,
        compareAtPrice: null,
        stock: v.stock,
        options: v.options,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      product.addVariant(variant)
    })

    // 4. 存入持久化層
    await this.repository.save(product)

    // 5. 觸發 Hook，讓外部系統同步 (如：Search Indexer)
    await this.core.hooks.doAction('catalog:product-created', {
      productId: product.id,
      skuCount: product.variants.length,
    })

    return ProductMapper.toDTO(product)
  }
}
