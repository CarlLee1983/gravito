import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when funds are deposited into an account.
 */
export class MoneyDeposited extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the account receiving funds.
   * @param payload - Amount deposited and the resulting balance in cents.
   * @param timestamp - The exact time the deposit occurred.
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
