import { QueueManager } from '@gravito/stream'
import * as amqplib from 'amqplib'
import Redis from 'ioredis'
import { env } from './env'
import { ProcessWorkflowJob } from './jobs/ProcessWorkflowJob'

let manager: QueueManager | null = null

export async function getQueueManager() {
  if (manager) return manager

  const driver = env.queueDriver
  const driverConfig: any = { default: driver }

  console.log(`🔌 Initializing QueueManager with driver: ${driver}`)

  if (driver === 'rabbitmq') {
    const connection = await amqplib.connect(env.rabbitUrl)
    driverConfig.connections = {
      rabbitmq: {
        driver: 'rabbitmq',
        client: connection,
        exchange: env.rabbitExchange,
      },
    }
  } else if (driver === 'redis') {
    const client = new Redis(env.redisUrl)
    driverConfig.connections = {
      redis: {
        driver: 'redis',
        client: client,
        prefix: 'flux:queue:',
      },
    }
  } else if (driver === 'memory') {
    console.warn('⚠️  Running with MEMORY driver (Not persisted)')
    driverConfig.connections = {
      memory: { driver: 'memory' },
    }
  } else {
    throw new Error(`Unsupported queue driver: ${driver}`)
  }

  manager = new QueueManager(driverConfig)

  // Register job classes for serialization
  manager.registerJobClasses([ProcessWorkflowJob as any])

  return manager
}
