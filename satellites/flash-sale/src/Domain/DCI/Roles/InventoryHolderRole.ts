/**
 * InventoryHolderRole - 庫存持有者角色
 *
 * 職責：執行庫存的扣減與釋放
 * - 扣減庫存（搶購時）
 * - 釋放庫存（取消訂單時）
 * - 持久化庫存變更
 *
 * 使用 Closures Pattern：注入 Product entity + IProductRepository
 */

import type { IProductRepository } from '../../Contracts/IProductRepository'
import type { Product } from '../../Entities/Product'

/**
 * InventoryHolderRole 回傳的行為介面
 */
export interface InventoryHolder {
  /** 扣減庫存 */
  deductInventory(quantity: number): Promise<void>
  /** 釋放庫存（回補） */
  releaseInventory(quantity: number): Promise<void>
}

/**
 * 注入 InventoryHolder 角色
 *
 * @param product - 商品實體
 * @param repository - 商品 Repository（用於持久化）
 * @returns 包含庫存操作行為的閉包物件
 */
export function injectInventoryHolder(
  product: Product,
  repository: IProductRepository
): InventoryHolder {
  return {
    async deductInventory(quantity: number): Promise<void> {
      // deductStock 內部會驗證數量合法性和庫存充足性
      product.deductStock(quantity)
      await repository.save(product)
    },

    async releaseInventory(quantity: number): Promise<void> {
      // replenishStock 內部會驗證數量合法性
      product.replenishStock(quantity)
      await repository.save(product)
    },
  }
}
