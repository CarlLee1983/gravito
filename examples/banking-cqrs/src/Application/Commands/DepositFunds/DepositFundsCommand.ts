import type { Command } from '@gravito/enterprise'

/**
 * Deposit Funds Command
 *
 * Represents a request to add money to a bank account.
 *
 * @since 1.0.0
 */
export class DepositFundsCommand implements Command {
  /**
   * Constructor
   *
   * @param accountId - Target account identifier
   * @param amountCents - Amount to deposit in cents (integer)
   * @param currency - Currency code (default: 'TWD')
   */
  constructor(
    readonly accountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
