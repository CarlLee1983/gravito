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
export class CommandKernel {
  private commands = new Map<string, CommandHandler>()

  constructor(private container: Container) {}

  /**
   * Register a new command handler.
   */
  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler)
  }

  /**
   * Handle an incoming CLI command.
   *
   * @param argv - Array of command line arguments (e.g. process.argv.slice(2))
   */
  async handle(argv: string[]): Promise<void> {
    const [name, ...args] = argv

    if (!name) {
      throw new Error('No command name provided')
    }

    const handler = this.commands.get(name)

    if (!handler) {
      throw new Error(`Command '${name}' not found`)
    }

    await handler(args, this.container)
  }
}
