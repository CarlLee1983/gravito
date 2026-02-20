import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Command to withdraw money from a specific account.
 */
export class WithdrawMoneyCommand extends Command {
  /**
   * @param accountId - The unique identifier of the source account.
   * @param amountCents - The amount to withdraw in cents.
   */
  constructor(
    public readonly accountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

/**
 * Handles the logic for withdrawing money from an account.
 */
export class WithdrawMoneyCommandHandler implements CommandHandler<WithdrawMoneyCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the withdrawal operation.
   *
   * @param command - The withdrawal command.
   * @throws {Error} If the account does not exist or has insufficient funds.
   */
  async handle(command: WithdrawMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`Account not found: ${command.accountId}`)
    }

    account.withdraw(command.amountCents)
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
