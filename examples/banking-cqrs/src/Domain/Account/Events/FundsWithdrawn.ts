import { DomainEvent } from '@gravito/enterprise'

/**
 * Data payload for the FundsWithdrawn domain event
 */
export interface FundsWithdrawnData {
  /** Account ID performing withdrawal */
  accountId: string
  /** Amount withdrawn in cents */
  amount: number
  /** New balance in cents after withdrawal */
  balanceAfter: number
  /** Currency code */
  currency: string
  /** Timestamp when the withdrawal occurred */
  withdrawnAt: Date
}

/**
 * Funds Withdrawn Domain Event
 *
 * Emitted when account balance is decreased via a withdrawal operation.
 *
 * @since 1.0.0
 */
export class FundsWithdrawn extends DomainEvent {
  /**
   * Constructor
   *
   * @param accountId - Source account ID
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @param withdrawnAt - Operation timestamp
   */
  constructor(
    readonly accountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly withdrawnAt: Date = new Date()
  ) {
    super()
  }

  /**
   * Gets the aggregate ID
   *
   * @returns Account ID
   */
  getAggregateId(): string {
    return this.accountId
  }

  /**
   * Serializes to JSON
   *
   * @returns Serialized data
   */
  toJSON(): FundsWithdrawnData {
    return {
      accountId: this.accountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      withdrawnAt: this.withdrawnAt,
    }
  }
}
