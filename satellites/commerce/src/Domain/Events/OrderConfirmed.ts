import { DomainEvent } from '@gravito/enterprise'

/**
 * 訂單已確認事件
 */
export class OrderConfirmed extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly memberId: string | null,
    public readonly totalAmount: number
  ) {
    super('OrderConfirmed')
  }
}
