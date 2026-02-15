import type { OrderItem } from '../models'

/**
 * Order Item Response DTO
 *
 * Type-safe API response for order item data.
 */
export interface OrderItemResponseDTO {
  id: number
  orderId: number
  productId: number
  productName: string
  quantity: number
  price: number
  lineTotal: number
}

/**
 * Order Item Presenter
 *
 * Transforms OrderItem model to API response.
 * Handles snake_case to camelCase conversion.
 */
export class OrderItemPresenter {
  static present(item: OrderItem): OrderItemResponseDTO {
    return {
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.getLineTotal(),
    }
  }
}
