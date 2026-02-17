import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { randomUUID } from 'crypto'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import type { DepositFundsCommand } from './DepositFundsCommand'

export class DepositFundsHandler implements CommandHandler<DepositFundsCommand, void> {
  constructor(
    private accountRepository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
    private core: PlanetCore
  ) {}

  async handle(command: DepositFundsCommand): Promise<void> {
    const account = await this.accountRepository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶 ${command.accountId} 不存在`)
    }

    const amount = new Money(command.amountCents, command.currency)
    account.deposit(amount)

    await this.accountRepository.save(account)

    const transaction = Transaction.deposit(
      randomUUID(),
      command.accountId,
      command.amountCents,
      account.balance.cents,
      command.currency
    )
    await this.transactionRepository.save(transaction)

    const events = account.pullDomainEvents()
    for (const event of events) {
      this.core.hooks.doAction(`cqrs:domain-event`, event)
    }
  }
}
