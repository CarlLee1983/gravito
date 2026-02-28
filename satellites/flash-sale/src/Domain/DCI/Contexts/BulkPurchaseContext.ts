/**
 * BulkPurchaseContext - 多商品搶購 Context
 *
 * 協調 PurchaserRole + InventoryHolderRole 完成多商品搶購流程：
 * 1. 批量載入商品
 * 2. 驗證所有商品可購買性（PurchaserRole）
 * 3. 逐個扣減庫存（InventoryHolderRole）+ 回滾機制
 * 4. 建立多項目訂單
 * 5. 保存訂單
 */

import { FlashSaleError, FlashSaleErrorCode } from '../../../Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import type { IProductRepository } from '../../Contracts/IProductRepository'
import { Order } from '../../Entities/Order'
import { OrderItem } from '../../ValueObjects/OrderItem'
import { injectInventoryHolder } from '../Roles/InventoryHolderRole'
import { injectPurchaser } from '../Roles/PurchaserRole'

/**
 * 批量搶購的單項商品
 */
export interface BulkPurchaseItem {
  productId: string
  quantity: number
}

/**
 * BulkPurchaseContext
 *
 * 多商品搶購流程的 DCI Context
 */
export class BulkPurchaseContext {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly orderRepo: IOrderRepository
  ) {}

  /**
   * 執行多商品搶購流程
   *
   * @param userId - 購買者 ID
   * @param items - 購買商品列表
   * @returns 建立的訂單
   * @throws FlashSaleError 若任一商品不存在、非 ACTIVE、庫存不足或批量驗證失敗
   */
  async execute(userId: string, items: BulkPurchaseItem[]): Promise<Order> {
    // 驗證輸入
    if (!items || items.length === 0) {
      throw new FlashSaleError(
        'Items list cannot be empty',
        FlashSaleErrorCode.INVALID_QUANTITY,
        400
      )
    }

    // 1. 批量載入所有商品
    const productIds = items.map((item) => item.productId)
    const products = await this.productRepo.findByIds(productIds)

    // 2. 驗證所有商品都存在且可購買
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw FlashSaleError.productNotFound(item.productId)
      }

      // 驗證可購買性（PurchaserRole）
      const purchaser = injectPurchaser(product)
      purchaser.validatePurchase(item.quantity)
    }

    // 3. 逐個扣減庫存（按 productId 排序避免死鎖）
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId))
    const deducted: { productId: string; quantity: number }[] = []

    try {
      for (const item of sortedItems) {
        const product = productMap.get(item.productId)!
        const inventoryHolder = injectInventoryHolder(product, this.productRepo)
        await inventoryHolder.deductInventory(item.quantity)
        deducted.push({ productId: item.productId, quantity: item.quantity })
      }
    } catch (error) {
      // 回滾已扣減的庫存
      for (const deductedItem of deducted) {
        const product = productMap.get(deductedItem.productId)!
        const inventoryHolder = injectInventoryHolder(product, this.productRepo)
        await inventoryHolder.releaseInventory(deductedItem.quantity)
      }
      throw error
    }

    // 4. 建立訂單項目
    const orderItems: OrderItem[] = items.map((item) => {
      const product = productMap.get(item.productId)!
      return OrderItem.create(product.id, product.name, item.quantity, product.price)
    })

    // 5. 建立並保存訂單
    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const order = Order.create(orderId, userId, orderItems)

    await this.orderRepo.save(order)

    return order
  }
}
