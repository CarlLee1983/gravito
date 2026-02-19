import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import { Money } from '../../../Domain/Shared/Money'
import { publishDomainEvents } from '../../Bus/publishDomainEvents'
import type { DepositFundsCommand } from './DepositFundsCommand'

/**
 * Deposit Funds Command Handler
 *
 * Implements the business logic for depositing funds into a bank account.
 * This handler is called by CommandBus when DepositFundsCommand is dispatched.
 *
 * **Execution Flow:**
 * ```
 * CommandBus.dispatch(DepositFundsCommand)
 *   → DepositFundsHandler.handle()
 *     1. Load account aggregate from repository
 *     2. Check account exists (throw if not)
 *     3. Call deposit() method on aggregate (may generate FundsDeposited event)
 *     4. Persist to database
 *     5. Publish domain events
 * ```
 *
 * **Domain Events:**
 * When funds are successfully deposited, a FundsDeposited event is generated
 * and published to all subscribers for audit and analytics.
 *
 * **Error Handling:**
 * - Throws if account not found
 * - Business rules in Account.deposit() may throw (e.g., negative amount)
 * - Database errors propagate to caller
 *
 * **Dependencies:**
 * - IAccountRepository: for loading and persistence
 * - PlanetCore: for event hook publishing
 *
 * @implements {CommandHandler<DepositFundsCommand, void>}
 *
 * @example
 * ```typescript
 * const handler = new DepositFundsHandler(repository, core)
 * const command = new DepositFundsCommand('acc-123', 50000, 'TWD')
 * await handler.handle(command)
 * // Balance increased, FundsDeposited event published
 * ```
 *
 * @since 1.0.0
 */
export class DepositFundsHandler implements CommandHandler<DepositFundsCommand, void> {
  /**
   * Constructor
   *
   * @param repository - Account repository for loading and persistence
   * @param core - PlanetCore instance for event publishing
   */
  constructor(
    private repository: IAccountRepository,
    private core: PlanetCore
  ) {}

  /**
   * Handles the DepositFundsCommand
   *
   * **Preconditions:**
   * - Account must exist in database
   * - Amount must be positive (validated in Account.deposit)
   *
   * **Side Effects:**
   * - Updates account balance (in memory and database)
   * - Publishes FundsDeposited domain event
   *
   * @param command - DepositFundsCommand with accountId, amountCents, currency
   * @throws Error if account not found
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * const command = new DepositFundsCommand('acc-123', 50000, 'TWD')
   * await handler.handle(command)
   * ```
   */
  async handle(command: DepositFundsCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    if (!account) {
      throw new Error(`帳戶 ${command.accountId} 不存在`)
    }

    account.deposit(new Money(command.amountCents, command.currency))

    await this.repository.save(account)

    await publishDomainEvents(this.core, account)
  }
}
