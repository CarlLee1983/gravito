import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import { Account } from '../../domain/account/Account'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

export class OpenAccountCommand extends Command {
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

export class OpenAccountCommandHandler implements CommandHandler<OpenAccountCommand, string> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

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
