import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { randomUUID } from 'crypto'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import type { TransferFundsCommand } from './TransferFundsCommand'

/**
 * Transfer Funds Command Handler
 *
 * Manages the atomicity of a transfer between two accounts.
 * This handler updates both sender and recipient aggregates and creates
 * corresponding transaction records for both sides.
 *
 * @implements {CommandHandler<TransferFundsCommand, void>}
 * @since 1.0.0
 */
export class TransferFundsHandler implements CommandHandler<TransferFundsCommand, void> {
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
   * Handles the transfer operation with ACID guarantees
   *
   * Executes the transfer within a database transaction to ensure atomicity.
   * If any step fails, the entire operation is rolled back, preventing partial updates.
   *
   * **Transaction Flow:**
   * 1. Load both sender and recipient accounts (with row locks)
   * 2. Execute business logic (transferTo/receiveTransfer)
   * 3. Save both accounts
   * 4. Create outgoing and incoming transaction records
   * 5. Publish domain events (outside transaction to avoid nested transactions)
   *
   * @param command - Transfer parameters
   * @throws Error if either account is not found
   * @throws Error if rules (balance, limits) are violated
   * @throws Database error if transaction fails
   */
  async handle(command: TransferFundsCommand): Promise<void> {
    // Execute entire transfer within a database transaction
    await DB.transaction(async (trx) => {
      const fromAccount = await this.accountRepository.findById(command.fromAccountId, trx)
      if (!fromAccount) {
        throw new Error(`帳戶 ${command.fromAccountId} 不存在`)
      }

      const toAccount = await this.accountRepository.findById(command.toAccountId, trx)
      if (!toAccount) {
        throw new Error(`帳戶 ${command.toAccountId} 不存在`)
      }

      const amount = new Money(command.amountCents, command.currency)

      // Execute domain logic
      fromAccount.transferTo(command.toAccountId, amount)
      toAccount.receiveTransfer(command.fromAccountId, amount)

      // Persist state changes within transaction
      await this.accountRepository.save(fromAccount, trx)
      await this.accountRepository.save(toAccount, trx)

      // Create transaction audit records within transaction
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

      await this.transactionRepository.save(outgoingTx, trx)
      await this.transactionRepository.save(incomingTx, trx)
    })

    // Publish domain events after successful transaction commit
    // This ensures events are only published if database changes persist
    const fromAccount = await this.accountRepository.findById(command.fromAccountId)
    if (fromAccount) {
      const events = fromAccount.pullDomainEvents()
      for (const event of events) {
        this.core.hooks.doAction(`cqrs:domain-event`, event)
      }
    }

    const toAccount = await this.accountRepository.findById(command.toAccountId)
    if (toAccount) {
      const events = toAccount.pullDomainEvents()
      for (const event of events) {
        this.core.hooks.doAction(`cqrs:domain-event`, event)
      }
    }
  }
}
