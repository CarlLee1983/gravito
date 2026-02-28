/**
 * PlaceOrder 請求驗證
 */

interface OrderItemInput {
  variantId?: unknown
  quantity?: unknown
}

export class PlaceOrderRequest {
  /**
   * 這是簡易版的驗證邏輯，未來可與 @gravito/impulse 深度整合
   */
  static validate(data: unknown) {
    if (
      typeof data !== 'object' ||
      data === null ||
      !('items' in data) ||
      !Array.isArray((data as { items: unknown }).items) ||
      (data as { items: unknown[] }).items.length === 0
    ) {
      throw new Error('Order items are required')
    }

    const items = (data as { items: OrderItemInput[] }).items

    for (const item of items) {
      if (!item.variantId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(
          'Invalid item structure: each item must have a variantId and a positive quantity'
        )
      }
    }
  }
}
