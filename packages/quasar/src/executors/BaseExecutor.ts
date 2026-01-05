import type { Redis } from 'ioredis'
import type { CommandExecutor, CommandResult, CommandType, QuasarCommand } from '../types'

/**
 * Base class for command executors with common utilities.
 */
export abstract class BaseExecutor implements CommandExecutor {
  abstract readonly supportedType: CommandType

  abstract execute(command: QuasarCommand, redis: Redis): Promise<CommandResult>

  protected success(commandId: string, message?: string): CommandResult {
    return {
      commandId,
      status: 'success',
      message,
      timestamp: Date.now(),
    }
  }

  protected failed(commandId: string, message: string): CommandResult {
    return {
      commandId,
      status: 'failed',
      message,
      timestamp: Date.now(),
    }
  }

  protected notAllowed(commandId: string): CommandResult {
    return {
      commandId,
      status: 'not_allowed',
      message: `Command type ${this.supportedType} is not allowed`,
      timestamp: Date.now(),
    }
  }
}
