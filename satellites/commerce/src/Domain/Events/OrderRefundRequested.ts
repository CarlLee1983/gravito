import { DomainEvent } from '@gravito/enterprise'

/**
 * 訂單退款申請事件
 */
export class OrderRefundRequested extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly memberId: string | null,
    public readonly totalAmount: number,
    public readonly reason?: string
  ) {
    super('OrderRefundRequested')
  }
}
