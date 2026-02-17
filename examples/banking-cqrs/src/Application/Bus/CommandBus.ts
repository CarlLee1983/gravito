import type { Container } from '@gravito/core'
import type { Command, CommandHandler } from '@gravito/enterprise'

/**
 * Command Bus - Central dispatcher for command execution
 *
 * Implements the CQRS pattern by routing commands to their corresponding handlers.
 * This bus uses the Gravito Container's dependency injection to resolve handlers
 * based on a naming convention: `cqrs.command.{CommandClassName}`
 *
 * **CQRS Concept:**
 * Commands represent **requests to change state** in the system.
 * Each command is routed to exactly one handler that modifies the aggregate
 * and publishes domain events.
 *
 * **Naming Convention:**
 * Handlers are registered in the Container with keys like:
 * - `cqrs.command.CreateAccountCommand` → CreateAccountHandler
 * - `cqrs.command.DepositFundsCommand` → DepositFundsHandler
 * - `cqrs.command.WithdrawFundsCommand` → WithdrawFundsHandler
 * - `cqrs.command.TransferFundsCommand` → TransferFundsHandler
 *
 * **Execution Flow:**
 * ```
 * Controller
 *   ↓ (creates command)
 * CommandBus.dispatch()
 *   ↓ (resolves handler)
 * Container.make(handlerKey)
 *   ↓ (executes business logic)
 * CommandHandler.handle()
 *   ↓ (returns result)
 * Controller
 * ```
 *
 * @example
 * ```typescript
 * const commandBus = container.make('cqrs.commandBus')
 *
 * const command = new DepositFundsCommand(
 *   accountId,
 *   amount,
 *   currency
 * )
 * await commandBus.dispatch(command)
 * // Handler executes, aggregates modified, events published
 * ```
 *
 * @since 1.0.0
 */
export class CommandBus {
  /**
   * Constructor
   *
   * @param container - Gravito IoC container for handler resolution
   */
  constructor(private container: Container) {}

  /**
   * Dispatches a command to its handler for execution
   *
   * This method implements the core CQRS command dispatch pattern:
   * 1. Derives handler key from command class name
   * 2. Resolves handler from container using naming convention
   * 3. Invokes handler with the command
   * 4. Returns handler result (usually void for commands, but can return identifiers)
   *
   * **Error Handling:**
   * - If handler is not registered: throws "not found" error from container
   * - If handler execution fails: error propagates up to controller/service layer
   * - Caller is responsible for transaction management and rollback
   *
   * **Generic Type Parameter:**
   * TResult defaults to `void` since commands typically modify state but don't return data.
   * However, some handlers may return created IDs or operation results.
   *
   * @template TResult - Return type from the command handler (default: void)
   * @param command - Command instance to execute
   * @returns Promise resolving to handler result
   * @throws Error if handler is not registered or execution fails
   *
   * @example
   * ```typescript
   * // Simple void command
   * const depositCmd = new DepositFundsCommand(accountId, amount, 'TWD')
   * await commandBus.dispatch(depositCmd)
   *
   * // Command with result (e.g., created account ID)
   * const createCmd = new CreateAccountCommand(ownerName, 'TWD')
   * const accountId = await commandBus.dispatch<string>(createCmd)
   * ```
   */
  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const handlerKey = `cqrs.command.${command.constructor.name}`
    const handler = this.container.make<CommandHandler<Command, TResult>>(handlerKey)
    return handler.handle(command)
  }
}
