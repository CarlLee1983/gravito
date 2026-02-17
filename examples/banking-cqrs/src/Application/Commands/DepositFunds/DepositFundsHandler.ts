import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { randomUUID } from 'crypto'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import type { DepositFundsCommand } from './DepositFundsCommand'

/**
 * Deposit Funds Command Handler
 *
 * Coordinates the deposit process:
 * 1. Retrieves account from repository
 * 2. Applies deposit logic to aggregate
 * 3. Persists updated balance
 * 4. Records transaction history
 * 5. Publishes domain events
 *
 * @implements {CommandHandler<DepositFundsCommand, void>}
 * @since 1.0.0
 */
export class DepositFundsHandler implements CommandHandler<DepositFundsCommand, void> {
  /**
   * Constructor
   *
   * @param accountRepository - Repository for account data
   * @param transactionRepository - Repository for transaction history
   * @param core - PlanetCore for event hooks
   */
  constructor(
    private accountRepository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
    private core: PlanetCore
  ) {}

  /**
   * Handles the deposit operation
   *
   * @param command - Deposit parameters
   * @throws Error if account not found
   * @throws Error if deposit violates domain rules
   */
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
