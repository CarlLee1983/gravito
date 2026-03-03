import { Command } from './Command'
/**
 * Interactive REPL command (Tinker) for interacting with the application.
 * @internal
 */
export declare class TinkerCommand extends Command {
  signature: string
  description: string
  handle(_args: Record<string, unknown>): Promise<void>
}
