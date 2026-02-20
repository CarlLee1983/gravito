import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

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
    private readonly eventManager: EventManager
  ) {}

  async handle(command: FreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.freeze(command.reason)
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}

export class UnfreezeAccountCommandHandler implements CommandHandler<UnfreezeAccountCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  async handle(command: UnfreezeAccountCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.unfreeze()
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
