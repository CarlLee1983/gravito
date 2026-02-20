import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { MoneyDeposited } from '../../domain/account/events/MoneyDeposited'
import type { UpdateReadModelListener } from '../../infrastructure/listeners/UpdateReadModelListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'

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
    private readonly eventManager: EventManager,
    private readonly readModelListener: UpdateReadModelListener
  ) {}

  async handle(command: DepositMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.deposit(command.amountCents)
    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      if (event.constructor.name === 'MoneyDeposited') {
        this.readModelListener.handleMoneyDeposited(event as MoneyDeposited)
      }
      await this.eventManager.dispatch(event as any)
    }
  }
}
