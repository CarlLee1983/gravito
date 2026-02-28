/**
 * PurchaseContext - 搶購核心流程 Context
 *
 * 協調 PurchaserRole + InventoryHolderRole 完成搶購流程：
 * 1. 載入商品
 * 2. 驗證可購買性（PurchaserRole）
 * 3. 扣減庫存（InventoryHolderRole）
 * 4. 建立訂單
 * 5. 保存訂單
 */

import { FlashSaleError } from '../../../Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import type { IProductRepository } from '../../Contracts/IProductRepository'
import { Order } from '../../Entities/Order'
import { OrderItem } from '../../ValueObjects/OrderItem'
import { injectInventoryHolder } from '../Roles/InventoryHolderRole'
import { injectPurchaser } from '../Roles/PurchaserRole'

/**
 * PurchaseContext
 *
 * 搶購流程的 DCI Context，協調多個 Role 完成完整的搶購交易
 */
export class PurchaseContext {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly orderRepo: IOrderRepository
  ) {}

  /**
   * 執行搶購流程
   *
   * @param userId - 購買者 ID
   * @param productId - 商品 ID
   * @param quantity - 購買數量
   * @returns 建立的訂單
   * @throws FlashSaleError 若商品不存在、非 ACTIVE、庫存不足
   */
  async execute(userId: string, productId: string, quantity: number): Promise<Order> {
    // 1. 載入商品
    const product = await this.productRepo.findById(productId)
    if (!product) {
      throw FlashSaleError.productNotFound(productId)
    }

    // 2. 注入 PurchaserRole 並驗證可購買性
    const purchaser = injectPurchaser(product)
    purchaser.validatePurchase(quantity)

    // 3. 注入 InventoryHolderRole 並扣減庫存
    const inventoryHolder = injectInventoryHolder(product, this.productRepo)
    await inventoryHolder.deductInventory(quantity)

    // 4. 建立訂單項目和訂單
    const orderItem = OrderItem.create(product.id, product.name, quantity, product.price)

    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const order = Order.create(orderId, userId, [orderItem])

    // 5. 保存訂單
    await this.orderRepo.save(order)

    return order
  }
}
