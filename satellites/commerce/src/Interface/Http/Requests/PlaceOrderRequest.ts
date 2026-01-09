export class PlaceOrderRequest {
  /**
   * 這是簡易版的驗證邏輯，未來可與 @gravito/impulse 深度整合
   */
  static validate(data: any) {
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Order items are required')
    }

    for (const item of data.items) {
      if (!item.variantId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(
          'Invalid item structure: each item must have a variantId and a positive quantity'
        )
      }
    }
  }
}
