import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when a fund transfer between two accounts has successfully completed.
 */
export class TransferCompleted extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the source account.
   * @param payload - Details of the completed transfer (ID, accounts, amount).
   * @param timestamp - The exact time the transfer was finalized.
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
