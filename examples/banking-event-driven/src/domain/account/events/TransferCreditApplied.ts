import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when the credit portion of a transfer is applied to the recipient account.
 */
export class TransferCreditApplied extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the recipient account.
   * @param payload - Transfer ID, amount credited, and the resulting balance in cents.
   * @param timestamp - The exact time the credit was applied.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      amountCents: number
      newBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
