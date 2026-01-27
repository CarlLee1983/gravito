import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

export class PauseQueueExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'PAUSE_QUEUE'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    if (command.type !== 'PAUSE_QUEUE') {
      return this.notAllowed(command.id)
    }

    const { queue, driver } = command.payload

    if (driver === 'bullmq' || driver === 'bull') {
      await redis.set(`bull:${queue}:meta:paused`, '1')
      await redis.publish(`bull:${queue}:meta`, 'paused')
    } else if (driver === 'bee-queue') {
      return this.failed(command.id, 'Pause not supported for bee-queue via Redis')
    }

    return this.success(command.id, `Queue ${queue} paused`)
  }
}
