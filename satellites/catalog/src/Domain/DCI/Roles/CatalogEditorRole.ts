import type { Product, ProductStatus, Variant } from '../../Entities/Product'
import type { I18nText } from '../../ValueObjects/I18nText'
import type { Slug } from '../../ValueObjects/Slug'

/**
 * 商品編輯資訊
 */
export interface UpdateProductData {
  name?: I18nText
  slug?: Slug
  description?: string
  brand?: string
  categoryIds?: string[]
}

/**
 * 商品編輯者角色
 * DCI 模式：包含商品編輯、狀態管理、變體管理的業務邏輯
 */
export interface CatalogEditor {
  /**
   * 更新商品基本資訊
   */
  updateProductInfo(data: UpdateProductData): void

  /**
   * 商品上架（驗證邏輯在此）
   */
  activateProduct(): void

  /**
   * 商品下架（驗證邏輯在此）
   */
  archiveProduct(): void

  /**
   * 新增商品變體
   */
  addVariant(variant: Variant): void

  /**
   * 移除商品變體
   */
  removeVariant(variantId: string): void
}

/**
 * 將商品編輯者角色注入到 Product 實體中
 * DCI 模式：Role 包含業務邏輯，Entity 只提供 setter
 */
export function injectCatalogEditor(product: Product): CatalogEditor {
  return {
    updateProductInfo(data: UpdateProductData): void {
      if (data.name) {
        product.setName(data.name)
      }
      if (data.slug) {
        product.setSlug(data.slug)
      }
      if (data.description !== undefined) {
        product.setDescription(data.description)
      }
      if (data.brand !== undefined) {
        product.setBrand(data.brand)
      }
      if (data.categoryIds) {
        product.setCategoryIds(data.categoryIds)
      }
    },

    activateProduct(): void {
      // 業務規則：已歸檔的商品不能重新啟用
      if (product.status === 'archived') {
        throw new Error('Cannot activate product: cannot reactivate archived product')
      }
      product.setStatus('active' as ProductStatus)
    },

    archiveProduct(): void {
      // 業務規則：已歸檔的商品不能再次歸檔
      if (product.status === 'archived') {
        throw new Error('Product is already archived')
      }
      product.setStatus('archived' as ProductStatus)
    },

    addVariant(variant: Variant): void {
      // 驗證變體所屬商品
      if (variant.productId !== product.id) {
        throw new Error('Variant product ID mismatch')
      }
      const variants = [...product.variants, variant]
      product.setVariants(variants)
    },

    removeVariant(variantId: string): void {
      const variants = product.variants.filter((v) => v.id !== variantId)
      product.setVariants(variants)
    },
  }
}
