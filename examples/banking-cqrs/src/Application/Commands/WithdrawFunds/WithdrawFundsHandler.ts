import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../../Domain/Transaction/Transaction'
import { publishDomainEvents } from '../../Bus/publishDomainEvents'
import type { WithdrawFundsCommand } from './WithdrawFundsCommand'

/**
 * Withdraw Funds Command Handler
 *
 * Implements the business logic for withdrawing funds from a bank account.
 * This handler is called by CommandBus when WithdrawFundsCommand is dispatched.
 *
 * **Execution Flow:**
 * ```
 * CommandBus.dispatch(WithdrawFundsCommand)
 *   → WithdrawFundsHandler.handle()
 *     1. Load account aggregate from repository
 *     2. Check account exists (throw if not)
 *     3. Call withdraw() method on aggregate (may throw if insufficient funds)
 *     4. Persist to database
 *     5. Publish domain events
 * ```
 *
 * **Domain Events:**
 * When funds are successfully withdrawn, a FundsWithdrawn event is generated
 * and published to all subscribers for audit, analytics, and compliance.
 *
 * **Error Handling:**
 * - Throws if account not found
 * - Business rules may throw: insufficient funds, negative amount, etc.
 * - Database errors propagate to caller
 *
 * **Dependencies:**
 * - IAccountRepository: for loading and persistence
 * - PlanetCore: for event hook publishing
 *
 * @implements {CommandHandler<WithdrawFundsCommand, void>}
 *
 * @example
 * ```typescript
 * const handler = new WithdrawFundsHandler(repository, core)
 * const command = new WithdrawFundsCommand('acc-123', 30000, 'TWD')
 * await handler.handle(command)
 * // Balance decreased, FundsWithdrawn event published
 * ```
 *
 * @since 1.0.0
 */
export class WithdrawFundsHandler implements CommandHandler<WithdrawFundsCommand, void> {
  /**
   * Constructor
   *
   * @param repository - Account repository for loading and persistence
   * @param transactionRepository - Transaction repository for recording withdrawals
   * @param core - PlanetCore instance for event publishing
   */
  constructor(
    private repository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
    private core: PlanetCore
  ) {}

  /**
   * Handles the WithdrawFundsCommand
   *
   * **Preconditions:**
   * - Account must exist in database
   * - Amount must be positive and <= available balance
   *
   * **Side Effects:**
   * - Updates account balance (in memory and database)
   * - Records withdrawal transaction for audit trail
   * - Publishes FundsWithdrawn domain event
   *
   * @param command - WithdrawFundsCommand with accountId, amountCents, currency
   * @throws Error if account not found
   * @throws Error if insufficient funds
   *
   * @example
   * ```typescript
   * const command = new WithdrawFundsCommand('acc-123', 30000, 'TWD')
   * await handler.handle(command)
   * ```
   */
  async handle(command: WithdrawFundsCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶 ${command.accountId} 不存在`)
    }

    account.withdraw(new Money(command.amountCents, command.currency))

    await this.repository.save(account)

    // Record withdrawal transaction for audit trail
    const transactionId = `txn-${Date.now()}`
    const withdrawalTransaction = Transaction.withdrawal(
      transactionId,
      command.accountId,
      command.amountCents,
      account.balance.cents,
      command.currency
    )
    await this.transactionRepository.save(withdrawalTransaction)

    await publishDomainEvents(this.core, account)
  }
}
