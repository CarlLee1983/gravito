import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { Product } from '../../Entities/Product'

/**
 * 庫存管理者角色
 * DCI 模式：包含庫存扣減、回復、檢查的業務邏輯
 */
export interface StockManager {
  /**
   * 扣減庫存（下單時）
   * 業務規則驗證在此層進行
   */
  deductStock(variantId: string, quantity: number): void

  /**
   * 回復庫存（退貨/取消時）
   */
  recoverStock(variantId: string, quantity: number): void

  /**
   * 檢查庫存是否充足
   */
  checkAvailability(variantId: string, quantity: number): boolean
}

/**
 * 將庫存管理者角色注入到 Product 實體中
 * DCI 模式：Role 包含庫存邏輯，Variant 只提供 setter
 */
export function injectStockManager(product: Product): StockManager {
  return {
    deductStock(variantId: string, quantity: number): void {
      const variant = product.variants.find((v) => v.id === variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }

      // 業務邏輯：驗證庫存充足
      if (!variant.stock.isEnoughFor(quantity)) {
        throw CatalogErrorFactory.insufficientStock(variant.stock.quantity, quantity)
      }

      // 扣減庫存
      const newStock = variant.stock.deduct(quantity)
      variant.setStock(newStock)

      // 更新 Product 中的變體列表
      const variants = product.variants.map((v) => (v.id === variantId ? variant : v))
      product.setVariants(variants)
    },

    recoverStock(variantId: string, quantity: number): void {
      const variant = product.variants.find((v) => v.id === variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }

      // 回復庫存
      const newStock = variant.stock.add(quantity)
      variant.setStock(newStock)

      // 更新 Product 中的變體列表
      const variants = product.variants.map((v) => (v.id === variantId ? variant : v))
      product.setVariants(variants)
    },

    checkAvailability(variantId: string, quantity: number): boolean {
      const variant = product.variants.find((v) => v.id === variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }
      return variant.stock.isEnoughFor(quantity)
    },
  }
}
