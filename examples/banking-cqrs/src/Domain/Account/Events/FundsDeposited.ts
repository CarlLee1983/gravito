import { DomainEvent } from '@gravito/enterprise'

/**
 * Data payload for the FundsDeposited domain event
 */
export interface FundsDepositedData {
  /** Account ID receiving the deposit */
  accountId: string
  /** Amount deposited in cents */
  amount: number
  /** New balance in cents after the deposit */
  balanceAfter: number
  /** Currency code */
  currency: string
  /** Timestamp when the deposit occurred */
  depositedAt: Date
}

/**
 * Funds Deposited Domain Event
 *
 * Emitted when account balance is increased via a deposit operation.
 *
 * @since 1.0.0
 */
export class FundsDeposited extends DomainEvent {
  /**
   * Constructor
   *
   * @param accountId - Target account ID
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @param depositedAt - Operation timestamp
   */
  constructor(
    readonly accountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly depositedAt: Date = new Date()
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
  toJSON(): FundsDepositedData {
    return {
      accountId: this.accountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      depositedAt: this.depositedAt,
    }
  }
}
