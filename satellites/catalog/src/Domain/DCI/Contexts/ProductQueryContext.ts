import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { IProductRepository, ProductFilters } from '../../Contracts/ICatalogRepository'
import type { Product } from '../../Entities/Product'

/**
 * 商品查詢上下文協調器
 * 統整商品查詢的完整流程
 */
export class ProductQueryContext {
  constructor(private readonly productRepo: IProductRepository) {}

  /**
   * 按 ID 取得商品
   */
  async getProduct(productId: string): Promise<Product | null> {
    return this.productRepo.findById(productId)
  }

  /**
   * 按 Slug 取得商品
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    return this.productRepo.findBySlug(slug)
  }

  /**
   * 按 Variant ID 取得商品
   */
  async getProductByVariantId(variantId: string): Promise<Product | null> {
    return this.productRepo.findByVariantId(variantId)
  }

  /**
   * 列表查詢商品
   */
  async listProducts(filters?: ProductFilters): Promise<Product[]> {
    return this.productRepo.findAll(filters)
  }

  /**
   * 取得商品的變體
   */
  async getVariant(productId: string, variantId: string) {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const variant = product.findVariant(variantId)
    if (!variant) {
      throw CatalogErrorFactory.variantNotFound(variantId)
    }

    return variant
  }

  /**
   * 檢查 SKU 是否已存在
   */
  async checkSkuExists(sku: string): Promise<boolean> {
    const products = await this.listProducts()
    return products.some((p) => p.variants.some((v) => v.sku === sku))
  }
}
