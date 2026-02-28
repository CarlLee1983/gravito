/**
 * CreateOrder UseCase（薄殼）
 *
 * 接收簡單輸入，委派 PurchaseContext 執行搶購邏輯，
 * 使用 OrderMapper 轉換結果為 OrderDTO。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../Domain/Contracts/IProductRepository'
import { PurchaseContext } from '../../Domain/DCI/Contexts/PurchaseContext'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderDTO'

/**
 * 建立訂單的輸入參數
 */
export interface CreateOrderInput {
  userId: string
  productId: string
  quantity: number
}

/**
 * CreateOrder UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 PurchaseContext
 */
export class CreateOrder {
  private readonly purchaseContext: PurchaseContext

  constructor(productRepo: IProductRepository, orderRepo: IOrderRepository) {
    this.purchaseContext = new PurchaseContext(productRepo, orderRepo)
  }

  /**
   * 執行建立訂單
   *
   * @param input - 建立訂單的輸入參數
   * @returns OrderDTO
   * @throws FlashSaleError 若商品不存在、非 ACTIVE、庫存不足
   */
  async execute(input: CreateOrderInput): Promise<OrderDTO> {
    // 委派 PurchaseContext 執行核心搶購邏輯
    const order = await this.purchaseContext.execute(input.userId, input.productId, input.quantity)

    // 轉換為 DTO
    return OrderMapper.toDTO(order)
  }
}
