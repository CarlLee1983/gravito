import type { Command } from '@gravito/enterprise'

/**
 * Withdraw Funds Command
 *
 * Represents a request to remove money from a bank account.
 *
 * @since 1.0.0
 */
export class WithdrawFundsCommand implements Command {
  /**
   * Constructor
   *
   * @param accountId - Source account identifier
   * @param amountCents - Amount to withdraw in cents
   * @param currency - Currency code
   */
  constructor(
    readonly accountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
