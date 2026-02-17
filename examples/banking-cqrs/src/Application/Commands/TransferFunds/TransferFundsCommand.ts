import type { Command } from '@gravito/enterprise'

/**
 * Transfer Funds Command
 *
 * Represents a request to move money between two accounts.
 *
 * @since 1.0.0
 */
export class TransferFundsCommand implements Command {
  /**
   * Constructor
   *
   * @param fromAccountId - Source account ID
   * @param toAccountId - Destination account ID
   * @param amountCents - Amount to transfer in cents
   * @param currency - Currency code
   */
  constructor(
    readonly fromAccountId: string,
    readonly toAccountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
