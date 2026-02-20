import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when a new account is opened.
 */
export class AccountOpened extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the newly opened account.
   * @param payload - Details of the new account (owner, currency, initial balance).
   * @param timestamp - The exact time the account was opened.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      ownerId: string
      ownerName: string
      currency: string
      initialBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
