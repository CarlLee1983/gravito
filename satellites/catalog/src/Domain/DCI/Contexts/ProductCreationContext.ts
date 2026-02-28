import type { PlanetCore } from '@gravito/core'
import type { IProductRepository } from '../../Contracts/ICatalogRepository'
import { Product, Variant } from '../../Entities/Product'
import { I18nText } from '../../ValueObjects/I18nText'
import { Money } from '../../ValueObjects/Money'
import { Slug } from '../../ValueObjects/Slug'
import { Stock } from '../../ValueObjects/Stock'
import { injectCatalogEditor } from '../Roles/CatalogEditorRole'

/**
 * 建立變體輸入
 */
export interface CreateVariantInput {
  sku: string
  name?: string
  price: number
  compareAtPrice?: number
  stock: number
  options: Record<string, string>
}

/**
 * 建立商品輸入
 */
export interface CreateProductInput {
  name: Record<string, string>
  slug: string
  brand?: string
  description?: string
  categoryIds?: string[]
  variants: CreateVariantInput[]
}

/**
 * 商品建立上下文協調器
 * 統整商品建立的完整流程，使用 DCI 角色注入
 */
export class ProductCreationContext {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 執行商品建立流程
   */
  async execute(input: CreateProductInput): Promise<Product> {
    // 1. 建立 ValueObject
    const name = I18nText.of(input.name)
    const slug = Slug.of(input.slug)

    // 2. 建立聚合根
    const product = Product.create(crypto.randomUUID(), name, slug)

    // 3. 設定基本資訊
    if (input.brand) {
      product.setBrand(input.brand)
    }
    if (input.description) {
      product.updateDescription(input.description)
    }

    // 4. 指派分類
    if (input.categoryIds) {
      input.categoryIds.forEach((cid) => {
        product.assignToCategory(cid)
      })
    }

    // 5. 注入編輯者角色，建立變體
    const editor = injectCatalogEditor(product, this.productRepo)
    for (const variantInput of input.variants) {
      const variant = new Variant(crypto.randomUUID(), {
        productId: product.id,
        sku: variantInput.sku,
        name: variantInput.name || null,
        price: Money.of(variantInput.price),
        compareAtPrice: variantInput.compareAtPrice ? Money.of(variantInput.compareAtPrice) : null,
        stock: Stock.of(variantInput.stock),
        options: variantInput.options,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      editor.addVariant(variant)
    }

    // 6. 持久化
    await this.productRepo.save(product)

    // 7. 觸發 Hook
    await this.core.hooks.doAction('catalog:product-created', {
      productId: product.id,
      skuCount: product.variants.length,
    })

    return product
  }
}
