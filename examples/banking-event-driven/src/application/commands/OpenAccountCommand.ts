import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import { Account } from '../../domain/account/Account'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Command to open a new bank account with an initial deposit.
 */
export class OpenAccountCommand extends Command {
  /**
   * @param accountId - The unique identifier to be assigned to the new account.
   * @param ownerId - The unique identifier of the account owner.
   * @param ownerName - The display name of the account owner.
   * @param currency - The account's primary currency (e.g., TWD, USD).
   * @param initialDepositCents - The starting balance in cents.
   */
  constructor(
    public readonly accountId: string,
    public readonly ownerId: string,
    public readonly ownerName: string,
    public readonly currency: string,
    public readonly initialDepositCents: number
  ) {
    super()
  }
}

/**
 * Handles the logic for opening a new bank account.
 */
export class OpenAccountCommandHandler implements CommandHandler<OpenAccountCommand, string> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the account opening operation.
   *
   * @param command - The account opening command.
   * @returns The ID of the newly created account.
   */
  async handle(command: OpenAccountCommand): Promise<string> {
    const account = Account.open(
      command.accountId,
      command.ownerId,
      command.ownerName,
      command.currency,
      command.initialDepositCents
    )

    await this.repository.save(account)

    await dispatchAggregateEvents(account, this.eventManager)

    return account.id
  }
}
