import { Command } from './Command'
/**
 * Command to create a new database migration file.
 * @internal
 */
export declare class MakeMigrationCommand extends Command {
  signature: string
  description: string
  handle(args: Record<string, unknown>): Promise<void>
}
