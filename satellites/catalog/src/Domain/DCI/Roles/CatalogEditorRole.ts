import type { IProductRepository } from '../../Contracts/ICatalogRepository'
import type { Product, Variant } from '../../Entities/Product'
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
 * 提供商品基本資訊編輯、上下架、變體管理的行為契約
 */
export interface CatalogEditor {
  /**
   * 更新商品基本資訊
   */
  updateProductInfo(data: UpdateProductData): void

  /**
   * 商品上架
   */
  activateProduct(): void

  /**
   * 商品下架
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
 */
export function injectCatalogEditor(product: Product, _repo: IProductRepository): CatalogEditor {
  return {
    updateProductInfo(data: UpdateProductData): void {
      if (data.name) {
        product.updateName(data.name)
      }
      if (data.slug) {
        product.updateSlug(data.slug)
      }
      if (data.description !== undefined) {
        product.updateDescription(data.description)
      }
      if (data.brand !== undefined) {
        product.setBrand(data.brand)
      }
      if (data.categoryIds) {
        // 移除舊的分類，新增新的
        const oldCategoryIds = [...product.categoryIds]
        oldCategoryIds.forEach((cid) => {
          product.removeFromCategory(cid)
        })
        data.categoryIds.forEach((cid) => {
          product.assignToCategory(cid)
        })
      }
    },

    activateProduct(): void {
      product.activate()
    },

    archiveProduct(): void {
      product.archive()
    },

    addVariant(variant: Variant): void {
      if (variant.productId !== product.id) {
        throw new Error('Variant product ID mismatch')
      }
      product.addVariant(variant)
    },

    removeVariant(variantId: string): void {
      product.removeVariant(variantId)
    },
  }
}
