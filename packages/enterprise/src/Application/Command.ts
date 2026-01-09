/**
 * Base Command
 *
 * Represents an intent to change the state of the system.
 */
export abstract class Command {
  // biome-ignore lint/complexity/noUselessConstructor: mark constructor for coverage without changing behavior
  constructor() {}
}

/**
 * Command Handler Interface
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}
