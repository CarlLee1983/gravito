import type { Container } from './Container'
/**
 * CommandHandler type for custom CLI commands.
 */
export type CommandHandler = (args: string[], container: Container) => Promise<void> | void
/**
 * CommandKernel - Structured CLI Command handling.
 *
 * Manages registration and execution of custom CLI commands that can
 * reuse the application container and providers.
 *
 * @example
 * ```typescript
 * const kernel = new CommandKernel(container);
 * kernel.register('greet', (args) => console.log('Hello', args[0]));
 * await kernel.handle(['greet', 'Universe']);
 * ```
 */
export declare class CommandKernel {
  private container
  private commands
  constructor(container: Container)
  /**
   * Register a new command handler.
   */
  register(name: string, handler: CommandHandler): void
  /**
   * Handle an incoming CLI command.
   *
   * @param argv - Array of command line arguments (e.g. process.argv.slice(2))
   */
  handle(argv: string[]): Promise<void>
}
