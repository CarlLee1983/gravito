/**
 * Base Command
 */
export abstract class Command {
  abstract signature: string
  abstract description: string

  abstract handle(args: Record<string, unknown>): Promise<void>
}
