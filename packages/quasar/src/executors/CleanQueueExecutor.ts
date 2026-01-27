import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

export class CleanQueueExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'CLEAN_QUEUE'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    if (command.type !== 'CLEAN_QUEUE') {
      return this.notAllowed(command.id)
    }

    const { queue, driver, status, limit = 1000 } = command.payload

    if (driver === 'bullmq' || driver === 'bull') {
      const prefix = driver === 'bullmq' ? 'bull' : 'bull'
      const key = `${prefix}:${queue}:${status}`

      if (status === 'completed' || status === 'failed') {
        const removed = await redis.zremrangebyrank(key, 0, limit - 1)
        return this.success(command.id, `Cleaned ${removed} jobs from ${status}`)
      }

      if (status === 'wait' || status === 'paused') {
        return this.failed(command.id, 'Clean wait/paused not implemented safely via direct Redis')
      }
    }

    return this.failed(command.id, `Driver ${driver} not supported for clean`)
  }
}
