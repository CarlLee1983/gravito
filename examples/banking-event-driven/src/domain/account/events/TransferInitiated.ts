import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when a fund transfer is first initiated by a user or system.
 * This marks the start of the transfer saga.
 */
export class TransferInitiated extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the source account.
   * @param payload - Transfer details including ID, accounts, and amount.
   * @param timestamp - The exact time the transfer was initiated.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      fromAccountId: string
      toAccountId: string
      amountCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
