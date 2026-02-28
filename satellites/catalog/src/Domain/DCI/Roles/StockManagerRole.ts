import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { IProductRepository } from '../../Contracts/ICatalogRepository'
import type { Product } from '../../Entities/Product'

/**
 * 庫存管理者角色
 * 提供庫存扣減、回復、檢查的行為契約
 */
export interface StockManager {
  /**
   * 扣減庫存（下單時）
   */
  deductStock(variantId: string, quantity: number): Promise<void>

  /**
   * 回復庫存（退貨/取消時）
   */
  recoverStock(variantId: string, quantity: number): Promise<void>

  /**
   * 檢查庫存是否充足
   */
  checkAvailability(variantId: string, quantity: number): boolean
}

/**
 * 將庫存管理者角色注入到 Product 實體中
 */
export function injectStockManager(product: Product, _repo: IProductRepository): StockManager {
  return {
    async deductStock(variantId: string, quantity: number): Promise<void> {
      const variant = product.findVariant(variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }
      variant.reduceStock(quantity)
    },

    async recoverStock(variantId: string, quantity: number): Promise<void> {
      const variant = product.findVariant(variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }
      variant.addStock(quantity)
    },

    checkAvailability(variantId: string, quantity: number): boolean {
      const variant = product.findVariant(variantId)
      if (!variant) {
        throw CatalogErrorFactory.variantNotFound(variantId)
      }
      return variant.stock.isEnoughFor(quantity)
    },
  }
}
