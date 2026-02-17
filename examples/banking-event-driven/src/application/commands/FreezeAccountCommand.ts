import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { AccountFrozen } from '../../domain/account/events/AccountFrozen'
import type { AccountUnfrozen } from '../../domain/account/events/AccountUnfrozen'
import type { UpdateReadModelListener } from '../../infrastructure/listeners/UpdateReadModelListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'

export class FreezeAccountCommand extends Command {
  constructor(
    public readonly accountId: string,
    public readonly reason?: string
  ) {
    super()
  }
}

export class UnfreezeAccountCommand extends Command {
  constructor(public readonly accountId: string) {
    super()
  }
}

export class FreezeAccountCommandHandler implements CommandHandler<FreezeAccountCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly readModelListener: UpdateReadModelListener
  ) {}

  async handle(command: FreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.freeze(command.reason)
    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      if (event.constructor.name === 'AccountFrozen') {
        this.readModelListener.handleAccountFrozen(event as AccountFrozen)
      }
      await this.eventManager.dispatch(event as any)
    }
  }
}

export class UnfreezeAccountCommandHandler implements CommandHandler<UnfreezeAccountCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly readModelListener: UpdateReadModelListener
  ) {}

  async handle(command: UnfreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.unfreeze()
    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      if (event.constructor.name === 'AccountUnfrozen') {
        this.readModelListener.handleAccountUnfrozen(event as AccountUnfrozen)
      }
      await this.eventManager.dispatch(event as any)
    }
  }
}
