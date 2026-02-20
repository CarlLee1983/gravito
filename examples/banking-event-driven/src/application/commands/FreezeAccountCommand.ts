import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Command to freeze a specific account, preventing further transactions.
 */
export class FreezeAccountCommand extends Command {
  /**
   * @param accountId - The unique identifier of the account to freeze.
   * @param reason - Optional reason for freezing the account.
   */
  constructor(
    public readonly accountId: string,
    public readonly reason?: string
  ) {
    super()
  }
}

/**
 * Command to unfreeze a previously frozen account.
 */
export class UnfreezeAccountCommand extends Command {
  /**
   * @param accountId - The unique identifier of the account to unfreeze.
   */
  constructor(public readonly accountId: string) {
    super()
  }
}

/**
 * Handles the logic for freezing an account.
 */
export class FreezeAccountCommandHandler implements CommandHandler<FreezeAccountCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the freeze operation.
   *
   * @param command - The freeze command containing account ID and optional reason.
   * @throws {Error} If the account does not exist.
   */
  async handle(command: FreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`Account not found: ${command.accountId}`)
    }

    account.freeze(command.reason)
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}

/**
 * Handles the logic for unfreezing an account.
 */
export class UnfreezeAccountCommandHandler implements CommandHandler<UnfreezeAccountCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the unfreeze operation.
   *
   * @param command - The unfreeze command containing the account ID.
   * @throws {Error} If the account does not exist.
   */
  async handle(command: UnfreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`Account not found: ${command.accountId}`)
    }

    account.unfreeze()
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
