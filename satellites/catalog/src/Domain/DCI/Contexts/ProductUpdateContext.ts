import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { IProductRepository } from '../../Contracts/ICatalogRepository'
import type { Product } from '../../Entities/Product'
import { I18nText } from '../../ValueObjects/I18nText'
import { Slug } from '../../ValueObjects/Slug'
import { injectCatalogEditor, type UpdateProductData } from '../Roles/CatalogEditorRole'

/**
 * 更新商品輸入
 */
export interface UpdateProductInput {
  id: string
  name?: Record<string, string>
  slug?: string
  description?: string
  brand?: string
  categoryIds?: string[]
}

/**
 * 商品更新上下文協調器
 * 統整商品更新的完整流程
 */
export class ProductUpdateContext {
  constructor(private readonly productRepo: IProductRepository) {}

  /**
   * 更新商品基本資訊
   */
  async updateProduct(input: UpdateProductInput): Promise<Product> {
    const product = await this.productRepo.findById(input.id)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(input.id)
    }

    const editor = injectCatalogEditor(product, this.productRepo)

    const updateData: UpdateProductData = {}
    if (input.name) {
      updateData.name = I18nText.of(input.name)
    }
    if (input.slug) {
      updateData.slug = Slug.of(input.slug)
    }
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    if (input.brand !== undefined) {
      updateData.brand = input.brand
    }
    if (input.categoryIds) {
      updateData.categoryIds = input.categoryIds
    }

    editor.updateProductInfo(updateData)
    await this.productRepo.save(product)

    return product
  }

  /**
   * 上架商品
   */
  async activateProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const editor = injectCatalogEditor(product, this.productRepo)
    editor.activateProduct()
    await this.productRepo.save(product)

    return product
  }

  /**
   * 下架商品
   */
  async archiveProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const editor = injectCatalogEditor(product, this.productRepo)
    editor.archiveProduct()
    await this.productRepo.save(product)

    return product
  }
}
