/**
 * CreateBulkOrder UseCase（薄殼）
 *
 * 接收多商品輸入，委派 BulkPurchaseContext 執行搶購邏輯，
 * 使用 OrderMapper 轉換結果為 OrderDTO。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../Domain/Contracts/IProductRepository'
import {
  BulkPurchaseContext,
  type BulkPurchaseItem,
} from '../../Domain/DCI/Contexts/BulkPurchaseContext'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderDTO'

/**
 * 建立多商品訂單的輸入參數
 */
export interface CreateBulkOrderInput {
  userId: string
  items: BulkPurchaseItem[]
}

/**
 * CreateBulkOrder UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 BulkPurchaseContext
 */
export class CreateBulkOrder {
  private readonly bulkPurchaseContext: BulkPurchaseContext

  constructor(productRepo: IProductRepository, orderRepo: IOrderRepository) {
    this.bulkPurchaseContext = new BulkPurchaseContext(productRepo, orderRepo)
  }

  /**
   * 執行建立多商品訂單
   *
   * @param input - 建立訂單的輸入參數
   * @returns OrderDTO
   * @throws FlashSaleError 若任一商品不存在、非 ACTIVE、庫存不足
   */
  async execute(input: CreateBulkOrderInput): Promise<OrderDTO> {
    // 委派 BulkPurchaseContext 執行核心搶購邏輯
    const order = await this.bulkPurchaseContext.execute(input.userId, input.items)

    // 轉換為 DTO
    return OrderMapper.toDTO(order)
  }
}
