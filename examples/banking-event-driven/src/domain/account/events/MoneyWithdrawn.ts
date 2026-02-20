import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when funds are withdrawn from an account.
 */
export class MoneyWithdrawn extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the account from which funds were withdrawn.
   * @param payload - Amount withdrawn and the resulting balance in cents.
   * @param timestamp - The exact time the withdrawal occurred.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      amountCents: number
      newBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
