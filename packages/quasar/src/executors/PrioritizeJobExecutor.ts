import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

export class PrioritizeJobExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'PRIORITIZE_JOB'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    if (command.type !== 'PRIORITIZE_JOB') {
      return this.notAllowed(command.id)
    }

    const { queue, driver, jobId, priority } = command.payload

    if (driver === 'bullmq') {
      const key = `bull:${queue}:${jobId}`
      const exists = await redis.exists(key)

      if (!exists) {
        return this.failed(command.id, `Job ${jobId} not found`)
      }

      await redis.hset(key, 'priority', priority)
      return this.success(command.id, `Job ${jobId} priority updated to ${priority}`)
    }

    return this.failed(command.id, `Driver ${driver} not supported for prioritization`)
  }
}
