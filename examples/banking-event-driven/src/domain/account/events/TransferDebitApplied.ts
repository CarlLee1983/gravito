import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when the debit portion of a transfer is applied to the source account.
 */
export class TransferDebitApplied extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the source account.
   * @param payload - Transfer ID, amount debited, and the resulting balance in cents.
   * @param timestamp - The exact time the debit was applied.
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
