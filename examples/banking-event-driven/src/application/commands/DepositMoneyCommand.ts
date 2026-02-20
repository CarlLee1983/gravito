import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Command to deposit money into a specific account.
 */
export class DepositMoneyCommand extends Command {
  /**
   * @param accountId - The unique identifier of the target account.
   * @param amountCents - The amount to deposit in cents to avoid precision issues.
   */
  constructor(
    public readonly accountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

/**
 * Handles the logic for depositing money into an account.
 */
export class DepositMoneyCommandHandler implements CommandHandler<DepositMoneyCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the deposit operation.
   *
   * @param command - The deposit command containing account ID and amount.
   * @throws {Error} If the target account does not exist.
   */
  async handle(command: DepositMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`Account not found: ${command.accountId}`)
    }

    account.deposit(command.amountCents)
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
