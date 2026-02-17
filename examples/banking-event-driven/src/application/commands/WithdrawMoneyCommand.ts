import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { MoneyWithdrawn } from '../../domain/account/events/MoneyWithdrawn'
import type { UpdateReadModelListener } from '../../infrastructure/listeners/UpdateReadModelListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'

export class WithdrawMoneyCommand extends Command {
  constructor(
    public readonly accountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

export class WithdrawMoneyCommandHandler implements CommandHandler<WithdrawMoneyCommand, void> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly readModelListener: UpdateReadModelListener
  ) {}

  async handle(command: WithdrawMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶不存在: ${command.accountId}`)
    }

    account.withdraw(command.amountCents)
    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      if (event.constructor.name === 'MoneyWithdrawn') {
        this.readModelListener.handleMoneyWithdrawn(event as MoneyWithdrawn)
      }
      await this.eventManager.dispatch(event as any)
    }
  }
}
