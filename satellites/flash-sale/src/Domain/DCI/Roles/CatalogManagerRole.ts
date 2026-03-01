/**
 * CatalogManagerRole - 目錄管理者角色
 *
 * 職責：管理商品的上下架
 * - 啟用商品（INACTIVE -> ACTIVE）
 * - 停用商品（ACTIVE -> INACTIVE）
 * - 持久化商品狀態變更
 *
 * 使用 Closures Pattern：注入 Product entity + IProductRepository
 */

import { FlashSaleError, FlashSaleErrorCode } from '../../../Application/Errors/FlashSaleError'
import type { IProductRepository } from '../../Contracts/IProductRepository'
import type { Product } from '../../Entities/Product'
import { ProductStatus } from '../../Models'

/**
 * CatalogManagerRole 回傳的行為介面
 */
export interface CatalogManager {
  /** 啟用商品（上架） */
  activateProduct(): Promise<void>
  /** 停用商品（下架） */
  deactivateProduct(): Promise<void>
}

/**
 * 注入 CatalogManager 角色
 *
 * @param product - 商品實體
 * @param repository - 商品 Repository（用於持久化）
 * @returns 包含商品上下架行為的閉包物件
 */
export function injectCatalogManager(
  product: Product,
  repository: IProductRepository
): CatalogManager {
  return {
    async activateProduct(): Promise<void> {
      // 已經 ACTIVE 的商品不允許重複啟用
      if (product.status === ProductStatus.ACTIVE) {
        throw new FlashSaleError(
          `Product ${product.id} is already active`,
          FlashSaleErrorCode.INVALID_ORDER_STATUS,
          409
        )
      }
      product.transitionToActive()
      await repository.save(product)
    },

    async deactivateProduct(): Promise<void> {
      // 已經 INACTIVE 的商品不允許重複停用
      if (product.status === ProductStatus.INACTIVE) {
        throw new FlashSaleError(
          `Product ${product.id} is already inactive`,
          FlashSaleErrorCode.INVALID_ORDER_STATUS,
          409
        )
      }
      product.transitionToInactive()
      await repository.save(product)
    },
  }
}
