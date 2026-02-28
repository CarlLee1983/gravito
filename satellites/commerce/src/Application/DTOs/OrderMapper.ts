import type { Order } from '../../Domain/Entities/Order'
import type { OrderDTO } from './OrderDTO'

/**
 * 訂單 Mapper
 *
 * 將 Order Aggregate 轉換為 DTO 用於 API 回應
 */
export class OrderMapper {
  /**
   * 將單個訂單轉換為 DTO
   */
  static toDTO(order: Order): OrderDTO {
    return {
      id: order.id,
      memberId: order.memberId,
      idempotencyKey: order.idempotencyKey,
      status: order.status,
      subtotal: order.subtotal.value,
      adjustmentAmount: order.adjustmentAmount.value,
      total: order.total.value,
      currency: order.currency,
      items: order.items.map((item, index) => ({
        id: `item-${index}-${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        name: item.name,
        unitPrice: item.unitPrice.value,
        quantity: item.quantity,
        totalPrice: item.totalPrice.value,
        options: item.options,
      })),
      adjustments: order.adjustments.map((adj, index) => ({
        id: `adj-${index}-${adj.type}`,
        type: adj.type,
        label: adj.label,
        amount: adj.amount.value,
        sourceType: adj.sourceType,
        sourceId: adj.sourceId,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }
  }

  /**
   * 將訂單列表轉換為 DTO 列表
   */
  static toDTOList(orders: Order[]): OrderDTO[] {
    return orders.map((order) => this.toDTO(order))
  }
}
