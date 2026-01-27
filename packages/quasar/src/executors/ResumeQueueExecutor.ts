import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

export class ResumeQueueExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'RESUME_QUEUE'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    if (command.type !== 'RESUME_QUEUE') {
      return this.notAllowed(command.id)
    }

    const { queue, driver } = command.payload

    if (driver === 'bullmq' || driver === 'bull') {
      await redis.del(`bull:${queue}:meta:paused`)
      await redis.publish(`bull:${queue}:meta`, 'resumed')
    }

    return this.success(command.id, `Queue ${queue} resumed`)
  }
}
