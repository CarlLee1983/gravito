import { CatalogErrorFactory } from '../../../Application/Errors/CatalogError'
import type { IProductRepository } from '../../Contracts/ICatalogRepository'
import { injectStockManager } from '../Roles/StockManagerRole'

/**
 * 庫存項目
 */
export interface StockItem {
  productId: string
  variantId: string
  quantity: number
}

/**
 * 庫存管理上下文協調器
 * 統整庫存調整的完整流程，使用 DCI 角色注入
 */
export class InventoryManagementContext {
  constructor(private readonly productRepo: IProductRepository) {}

  /**
   * 扣減庫存（下單時）
   */
  async deductStock(productId: string, variantId: string, quantity: number): Promise<void> {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const stockManager = injectStockManager(product, this.productRepo)
    await stockManager.deductStock(variantId, quantity)
    await this.productRepo.save(product)
  }

  /**
   * 回復庫存（退貨/取消時）
   */
  async recoverStock(productId: string, variantId: string, quantity: number): Promise<void> {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const stockManager = injectStockManager(product, this.productRepo)
    await stockManager.recoverStock(variantId, quantity)
    await this.productRepo.save(product)
  }

  /**
   * 批次回復庫存（訂單取消）
   */
  async batchRecoverStock(items: StockItem[]): Promise<void> {
    for (const item of items) {
      await this.recoverStock(item.productId, item.variantId, item.quantity)
    }
  }

  /**
   * 檢查庫存是否充足
   */
  async checkAvailability(
    productId: string,
    variantId: string,
    quantity: number
  ): Promise<boolean> {
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw CatalogErrorFactory.productNotFound(productId)
    }

    const stockManager = injectStockManager(product, this.productRepo)
    return stockManager.checkAvailability(variantId, quantity)
  }
}
