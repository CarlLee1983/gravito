import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { randomUUID } from 'crypto'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import type { TransferFundsCommand } from './TransferFundsCommand'

export class TransferFundsHandler implements CommandHandler<TransferFundsCommand, void> {
  constructor(
    private accountRepository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
    private core: PlanetCore
  ) {}

  async handle(command: TransferFundsCommand): Promise<void> {
    const fromAccount = await this.accountRepository.findById(command.fromAccountId)
    if (!fromAccount) {
      throw new Error(`帳戶 ${command.fromAccountId} 不存在`)
    }

    const toAccount = await this.accountRepository.findById(command.toAccountId)
    if (!toAccount) {
      throw new Error(`帳戶 ${command.toAccountId} 不存在`)
    }

    const amount = new Money(command.amountCents, command.currency)

    fromAccount.transferTo(command.toAccountId, amount)
    toAccount.receiveTransfer(command.fromAccountId, amount)

    await this.accountRepository.save(fromAccount)
    await this.accountRepository.save(toAccount)

    const transactionId = randomUUID()
    const outgoingTx = Transaction.transfer(
      transactionId,
      command.fromAccountId,
      command.toAccountId,
      command.amountCents,
      fromAccount.balance.cents,
      command.currency,
      true
    )
    const incomingTx = Transaction.transfer(
      randomUUID(),
      command.toAccountId,
      command.fromAccountId,
      command.amountCents,
      toAccount.balance.cents,
      command.currency,
      false
    )

    await this.transactionRepository.save(outgoingTx)
    await this.transactionRepository.save(incomingTx)

    const events = [...fromAccount.pullDomainEvents(), ...toAccount.pullDomainEvents()]
    for (const event of events) {
      this.core.hooks.doAction(`cqrs:domain-event`, event)
    }
  }
}
