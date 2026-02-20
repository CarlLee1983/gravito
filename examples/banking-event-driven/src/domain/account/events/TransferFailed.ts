import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when a fund transfer fails during any stage of the saga.
 */
export class TransferFailed extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the source account.
   * @param payload - Transfer details and the reason for failure.
   * @param timestamp - The exact time the failure occurred.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      fromAccountId: string
      toAccountId: string
      amountCents: number
      reason: string
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
