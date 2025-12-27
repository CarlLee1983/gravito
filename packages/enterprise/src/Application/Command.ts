/**
 * Base Command
 *
 * Represents an intent to change the state of the system.
 */
export abstract class Command {}

/**
 * Command Handler Interface
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}
