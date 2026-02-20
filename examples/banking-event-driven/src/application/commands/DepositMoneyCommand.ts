import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

export class DepositMoneyCommand extends Command {
  constructor(
    public readonly accountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

export class DepositMoneyCommandHandler implements CommandHandler<DepositMoneyCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  async handle(command: DepositMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.deposit(command.amountCents)
    await this.repository.save(account)
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
