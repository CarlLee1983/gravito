import { DomainEvent } from '@gravito/enterprise'

/**
 * Data payload for the AccountCreated domain event
 */
export interface AccountCreatedData {
  /** Unique ID of the created account */
  accountId: string
  /** Name of the account owner */
  ownerName: string
  /** Currency code (e.g., 'TWD') */
  currency: string
  /** Timestamp when the account was created */
  createdAt: Date
}

/**
 * Account Created Domain Event
 *
 * Emitted when a new account aggregate is successfully initialized.
 * This event is used for event sourcing and notifying other components
 * (like the Transaction service) about new accounts.
 *
 * @since 1.0.0
 */
export class AccountCreated extends DomainEvent {
  /**
   * Constructor
   *
   * @param accountId - ID of the new account
   * @param ownerName - Owner's name
   * @param currency - Account currency
   * @param createdAt - Creation timestamp
   */
  constructor(
    readonly accountId: string,
    readonly ownerName: string,
    readonly currency: string,
    readonly createdAt: Date = new Date()
  ) {
    super()
  }

  /**
   * Gets the aggregate ID this event belongs to
   *
   * @returns Account ID
   */
  getAggregateId(): string {
    return this.accountId
  }

  /**
   * Serializes the event to a plain object for persistence or transmission
   *
   * @returns Serialized event data
   */
  toJSON(): AccountCreatedData {
    return {
      accountId: this.accountId,
      ownerName: this.ownerName,
      currency: this.currency,
      createdAt: this.createdAt,
    }
  }
}
