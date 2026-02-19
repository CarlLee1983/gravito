import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import type { Account } from '../../../Domain/Account/Account'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import { TransactionType } from '../../../Domain/Transaction/TransactionType'
import { publishDomainEvents } from '../../Bus/publishDomainEvents'
import type { TransferFundsCommand } from './TransferFundsCommand'

/**
 * Transfer Funds Command Handler
 *
 * Implements the business logic for transferring funds between two bank accounts.
 * This handler ensures atomicity and consistency of the transfer operation.
 *
 * **Execution Flow:**
 * ```
 * CommandBus.dispatch(TransferFundsCommand)
 *   → TransferFundsHandler.handle()
 *     1. Begin database transaction
 *     2. Load fromAccount and toAccount within transaction
 *     3. Call transferTo() on sender account
 *     4. Call receiveTransfer() on receiver account
 *     5. Save both accounts within transaction
 *     6. Commit transaction
 *     7. Publish domain events from both aggregates
 * ```
 *
 * **Transaction Semantics:**
 * - Both account updates are ACID-compliant: all-or-nothing
 * - If either update fails, entire transaction rolls back
 * - After commit, both accounts have generated events
 *
 * **Domain Events:**
 * Each account generates its own event (transferred out / in),
 * both published to subscribers for audit and balance reconciliation.
 *
 * **Critical Bug Fix:**
 * Previous implementation re-fetched aggregates from DB after commit,
 * causing domain events to be lost (new aggregates have empty event lists).
 * This version keeps references to in-transaction aggregates.
 *
 * **Error Handling:**
 * - Throws if either account not found
 * - Throws if insufficient funds or validation fails
 * - Database transaction automatically rolls back on error
 *
 * **Dependencies:**
 * - IAccountRepository: for loading and persistence
 * - ITransactionRepository: for recording transfers
 * - Atlas DB: for transaction management
 * - PlanetCore: for event hook publishing
 *
 * @implements {CommandHandler<TransferFundsCommand, void>}
 *
 * @example
 * ```typescript
 * const handler = new TransferFundsHandler(accountRepo, transactionRepo, core)
 * const command = new TransferFundsCommand('from-123', 'to-456', 50000, 'TWD')
 * await handler.handle(command)
 * // Both accounts updated atomically, both events published
 * ```
 *
 * @since 1.0.0
 */
export class TransferFundsHandler implements CommandHandler<TransferFundsCommand, void> {
  /**
   * Constructor
   *
   * @param accountRepository - Account repository for loading and persistence
   * @param transactionRepository - Transaction repository for recording transfers
   * @param core - PlanetCore instance for event publishing
   */
  constructor(
    private accountRepository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
    private core: PlanetCore
  ) {}

  /**
   * Handles the TransferFundsCommand
   *
   * **Preconditions:**
   * - Both fromAccount and toAccount must exist
   * - fromAccount must have sufficient balance
   * - Currencies must match
   *
   * **Side Effects:**
   * - Updates both account balances atomically
   * - Records transfer transaction for audit trail
   * - Publishes FundsTransferred events from both aggregates
   *
   * **Transaction Guarantee:**
   * All updates happen within a single DB transaction.
   * If any step fails, the entire transaction rolls back.
   *
   * @param command - TransferFundsCommand with fromAccountId, toAccountId, amountCents, currency
   * @throws Error if account not found
   * @throws Error if insufficient funds
   * @throws Error if currency mismatch
   *
   * @example
   * ```typescript
   * const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, 'TWD')
   * await handler.handle(command)
   * // Both accounts updated, events published
   * ```
   */
  async handle(command: TransferFundsCommand): Promise<void> {
    // Keep references to aggregates outside transaction
    // so we can publish their events after commit
    let fromAccount: Account | null = null
    let toAccount: Account | null = null

    await DB.transaction(async (trx) => {
      // Load both accounts within transaction
      fromAccount = await this.accountRepository.findById(command.fromAccountId, trx)
      if (!fromAccount) {
        throw new Error(`帳戶 ${command.fromAccountId} 不存在`)
      }

      toAccount = await this.accountRepository.findById(command.toAccountId, trx)
      if (!toAccount) {
        throw new Error(`帳戶 ${command.toAccountId} 不存在`)
      }

      const transferAmount = new Money(command.amountCents, command.currency)

      // Execute transfer: sender side
      fromAccount.transferTo(command.toAccountId, transferAmount)

      // Execute transfer: receiver side
      toAccount.receiveTransfer(command.fromAccountId, transferAmount)

      // Persist both updated accounts within transaction
      await this.accountRepository.save(fromAccount, trx)
      await this.accountRepository.save(toAccount, trx)

      // Record transfer transaction for audit trail
      const transactionId = `txn-${Date.now()}`
      const transferTransaction = new Transaction(
        transactionId,
        command.fromAccountId,
        TransactionType.TRANSFER_OUT,
        command.amountCents,
        fromAccount.balance.cents,
        command.currency,
        command.toAccountId,
        `轉帳給 ${command.toAccountId}`,
        new Date()
      )
      await this.transactionRepository.save(transferTransaction, trx)
    })

    // Publish events from both aggregates
    // Critical: aggregates still have their events because they were
    // kept in scope from inside the transaction
    if (fromAccount && toAccount) {
      await publishDomainEvents(this.core, fromAccount, toAccount)
    }
  }
}
