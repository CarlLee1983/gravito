import { AgendaBridge } from '../bridges/AgendaBridge'
import { QuasarError, QuasarErrorCodes } from '../errors/QuasarError'
import { BeeQueueBridge } from '../bridges/BeeQueueBridge'
import { BullBridge } from '../bridges/BullBridge'
import { BullMQBridge } from '../bridges/BullMQBridge'
import { GenericBridge } from '../bridges/GenericBridge'
import { BeeQueueProbe } from '../probes/BeeQueueProbe'
import { BullMQProbe } from '../probes/BullMQProbe'
import { BullProbe } from '../probes/BullProbe'
import { LaravelProbe } from '../probes/LaravelProbe'
import { RedisListProbe } from '../probes/RedisListProbe'
import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

export class CorePlugin implements QuasarPlugin {
  name = 'core'

  onRegister(agent: QuasarAgent): void {
    const registry = agent.getPluginRegistry()

    registry.registerProbe('redis', (redis, name) => new RedisListProbe(redis, name))
    registry.registerProbe('laravel', (redis, name) => new LaravelProbe(redis, name))
    registry.registerProbe('bull', (redis, name) => new BullProbe(redis, name))
    registry.registerProbe('bullmq', (redis, name) => new BullMQProbe(redis, name))
    registry.registerProbe('bee-queue', (redis, name) => new BeeQueueProbe(redis, name))

    registry.registerBridge(
      'bullmq',
      (redis, prefix, workerId, options) => new BullMQBridge(redis, prefix, workerId, options)
    )
    registry.registerBridge(
      'bee-queue',
      (redis, prefix, workerId, options) => new BeeQueueBridge(redis, prefix, workerId, options)
    )
    registry.registerBridge(
      'bull',
      (redis, prefix, workerId, options) => new BullBridge(redis, prefix, workerId, options)
    )
    registry.registerBridge(
      'agenda',
      (redis, prefix, workerId, options) => new AgendaBridge(redis, prefix, workerId, options)
    )
    registry.registerBridge('generic', (redis, prefix, workerId, options) => {
      if (!options?.eventMapping) {
        throw new QuasarError(
          QuasarErrorCodes.INVALID_CONFIG,
          'Generic bridge requires eventMapping option'
        )
      }
      return new GenericBridge(
        redis,
        prefix,
        workerId,
        options.eventMapping,
        options.queueName,
        options
      )
    })
  }
}
