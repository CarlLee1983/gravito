import type { Command } from '@gravito/enterprise'

/**
 * Create Account Command
 *
 * Represents a request to create a new bank account in the system.
 * Commands are immutable data transfer objects that describe state-changing operations.
 *
 * **CQRS Pattern:**
 * This command encapsulates the intent to create an account.
 * The actual business logic is in CreateAccountHandler, which:
 * 1. Validates the account doesn't already exist
 * 2. Creates Account aggregate
 * 3. Persists it to database
 * 4. Publishes domain events
 *
 * **Naming Convention:**
 * The handler for this command is registered as:
 * `cqrs.command.CreateAccountCommand` in the Container
 *
 * @example
 * ```typescript
 * const command = new CreateAccountCommand(
 *   crypto.randomUUID(),
 *   'Alice Chen',
 *   'TWD'
 * )
 * await commandBus.dispatch(command)
 * // Handler creates account and publishes AccountCreated event
 * ```
 *
 * @since 1.0.0
 */
export class CreateAccountCommand implements Command {
  /**
   * Constructor
   *
   * @param accountId - Unique account identifier (should be UUID v4)
   * @param ownerName - Account owner's display name
   * @param currency - Currency code (default: 'TWD' for Taiwan Dollar)
   */
  constructor(
    readonly accountId: string,
    readonly ownerName: string,
    readonly currency: string = 'TWD'
  ) {}
}
