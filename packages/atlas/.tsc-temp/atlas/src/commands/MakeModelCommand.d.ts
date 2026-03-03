import { Command } from './Command'
/**
 * Command to scaffold a new Eloquent model.
 * @internal
 */
export declare class MakeModelCommand extends Command {
  signature: string
  description: string
  handle(
    args: {
      name: string
      path?: string
      migration?: boolean
      migrationPath?: string
    } & Record<string, unknown>
  ): Promise<void>
}
