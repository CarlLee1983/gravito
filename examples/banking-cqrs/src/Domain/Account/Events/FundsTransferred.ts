import { DomainEvent } from '@gravito/enterprise'

/**
 * Data payload for the FundsTransferred domain event
 */
export interface FundsTransferredData {
  /** Sender account ID */
  accountId: string
  /** Recipient account ID */
  toAccountId: string
  /** Amount transferred in cents */
  amount: number
  /** Sender's balance in cents after the transfer */
  balanceAfter: number
  /** Currency code */
  currency: string
  /** Timestamp when the transfer occurred */
  transferredAt: Date
}

/**
 * Funds Transferred Domain Event
 *
 * Emitted when funds are sent from one account to another.
 * This event only records the sender's perspective in event sourcing.
 *
 * @since 1.0.0
 */
export class FundsTransferred extends DomainEvent {
  /**
   * Constructor
   *
   * @param accountId - Sender's account ID
   * @param toAccountId - Recipient's account ID
   * @param amount - Amount in cents
   * @param balanceAfter - Sender's new balance in cents
   * @param currency - Currency code
   * @param transferredAt - Operation timestamp
   */
  constructor(
    readonly accountId: string,
    readonly toAccountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly transferredAt: Date = new Date()
  ) {
    super()
  }

  /**
   * Gets the aggregate ID
   *
   * @returns Sender's account ID
   */
  getAggregateId(): string {
    return this.accountId
  }

  /**
   * Serializes to JSON
   *
   * @returns Serialized data
   */
  toJSON(): FundsTransferredData {
    return {
      accountId: this.accountId,
      toAccountId: this.toAccountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      transferredAt: this.transferredAt,
    }
  }
}
