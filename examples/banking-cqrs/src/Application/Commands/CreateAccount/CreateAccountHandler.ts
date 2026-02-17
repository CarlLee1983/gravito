import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { Account } from '../../../Domain/Account/Account'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { CreateAccountCommand } from './CreateAccountCommand'

/**
 * Create Account Command Handler
 *
 * Implements the business logic for creating a new bank account.
 * This is called by CommandBus when CreateAccountCommand is dispatched.
 *
 * **Execution Flow:**
 * ```
 * CommandBus.dispatch(CreateAccountCommand)
 *   → CreateAccountHandler.handle()
 *     1. Check account doesn't exist (idempotence)
 *     2. Create Account aggregate via factory method
 *     3. Persist to database
 *     4. Pull domain events from aggregate
 *     5. Publish events via Gravito hooks
 * ```
 *
 * **Domain Events:**
 * When account is created, an AccountCreated event is automatically generated
 * and published to all subscribers (e.g., notification satellite, analytics).
 *
 * **Error Handling:**
 * - Throws if account already exists (prevents duplicate accounts)
 * - Database errors propagate to caller for retry/compensation
 *
 * **Dependencies:**
 * - IAccountRepository: for persistence
 * - PlanetCore: for event hook publishing
 *
 * @implements {CommandHandler<CreateAccountCommand, void>}
 *
 * @example
 * ```typescript
 * const handler = new CreateAccountHandler(repository, core)
 * const command = new CreateAccountCommand(id, 'John', 'TWD')
 * await handler.handle(command)
 * // Account created, AccountCreated event published
 * ```
 *
 * @since 1.0.0
 */
export class CreateAccountHandler implements CommandHandler<CreateAccountCommand, void> {
  /**
   * Constructor
   *
   * @param repository - Account repository for persistence
   * @param core - PlanetCore instance for event publishing
   */
  constructor(
    private repository: IAccountRepository,
    private core: PlanetCore
  ) {}

  /**
   * Handles the CreateAccountCommand
   *
   * **Preconditions:**
   * - Account ID must not already exist in database
   * - Command must have valid ownerName and currency
   *
   * **Side Effects:**
   * - Creates new Account aggregate (status: ACTIVE)
   * - Inserts account record into database
   * - Publishes AccountCreated domain event to subscribers
   *
   * **Transaction Semantics:**
   * If database insert fails, repository error is thrown.
   * No rollback needed (nothing was partially committed).
   *
   * @param command - CreateAccountCommand with accountId, ownerName, currency
   * @throws Error if account already exists
   * @throws Database error if insert fails
   *
   * @example
   * ```typescript
   * const command = new CreateAccountCommand(
   *   'acc-123',
   *   'Alice Chen',
   *   'TWD'
   * )
   * await handler.handle(command)
   * // Result: Account created with zero balance, event published
   * ```
   */
  async handle(command: CreateAccountCommand): Promise<void> {
    const accountExists = await this.repository.existsById(command.accountId)
    if (accountExists) {
      throw new Error(`帳戶 ${command.accountId} 已存在`)
    }

    const account = Account.create(command.accountId, command.ownerName, command.currency)

    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      this.core.hooks.doAction(`cqrs:domain-event`, event)
    }
  }
}
