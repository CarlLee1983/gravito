import { DomainEvent } from '@gravito/enterprise'

/**
 * 訂單已建立事件
 */
export class OrderPlaced extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly memberId: string | null,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly items: Array<{
      variantId: string
      quantity: number
    }>
  ) {
    super('OrderPlaced')
  }
}
