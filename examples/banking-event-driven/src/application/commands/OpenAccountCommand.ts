import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import { Account } from '../../domain/account/Account'
import type { AccountOpened } from '../../domain/account/events/AccountOpened'
import type { UpdateReadModelListener } from '../../infrastructure/listeners/UpdateReadModelListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'

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
    private readonly eventManager: EventManager,
    private readonly readModelListener: UpdateReadModelListener
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

    const events = account.pullDomainEvents()
    for (const event of events) {
      if (event.constructor.name === 'AccountOpened') {
        this.readModelListener.handleAccountOpened(event as AccountOpened)
      }
      await this.eventManager.dispatch(event as any)
    }

    return account.id
  }
}
