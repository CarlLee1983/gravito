import { Command } from './Command'
export declare class DoctorCommand extends Command {
  signature: string
  description: string
  handle(flags: Record<string, unknown>): Promise<void>
}
