#!/usr/bin/env bun
import { Consumer, Job, QueueManager } from '@gravito/stream'
import Redis from 'ioredis'

/**
 * Flux Console Unified Worker Script
 *
 * Usage:
 *   bun scripts/worker.ts [queues] [--fail=rate] [--delay=ms]
 *
 * Example:
 *   bun scripts/worker.ts orders,reports --fail=0.1 --delay=200
 *   bun scripts/worker.ts all
 */

const redis = new Redis('redis://localhost:6379')
const prefix = 'queue:'

const queuesRaw = process.argv[2] || 'orders,notifications,test-batch,billing,analytics'
let queues: string[] = []

if (queuesRaw === 'all') {
  console.log('🔍 Discovering all queues...')
  const keys = await redis.keys(`${prefix}*`)
  const set = new Set<string>()
  for (const k of keys) {
    const name = k.slice(prefix.length).split(':')[0]
    // Exclude internal management keys
    if (
      name &&
      ![
        'active',
        'schedules',
        'schedule',
        'worker',
        'lock',
        'logs',
        'metrics',
        'throughput',
      ].includes(name)
    ) {
      set.add(name)
    }
  }
  queues = Array.from(set)
  if (queues.length === 0) {
    console.log('⚠️ No active queues found. Defaulting to standard set...')
    queues = ['orders', 'notifications', 'test-batch', 'billing', 'analytics']
  }
} else {
  queues = queuesRaw.split(',')
}

const failRate = parseFloat(process.argv.find((a) => a.startsWith('--fail='))?.split('=')[1] || '0')
const processDelay = parseInt(
  process.argv.find((a) => a.startsWith('--delay='))?.split('=')[1] || '100'
)

// Simple Job class for testing
class GenericJob extends Job {
  constructor(
    id: any = null,
    public data: any = {}
  ) {
    super()
    this.id = id
  }
  async handle() {
    // Simulated work
    if (processDelay > 0) {
      await new Promise((r) => setTimeout(r, processDelay))
    }

    // Simulated failure
    if (Math.random() < failRate) {
      throw new Error('Simulated random failure')
    }
  }
}

const manager = new QueueManager({
  default: 'redis',
  connections: {
    redis: {
      driver: 'redis',
      client: redis,
      prefix,
    },
  },
})

manager.registerJobClasses([GenericJob])

console.log('🚀 Starting Flux Unified Worker...')
console.log(`📡 Queues: ${queues.join(', ')}`)
console.log(`⚠️ Fail Rate: ${(failRate * 100).toFixed(0)}%`)
console.log(`⏱️ Sim Delay: ${processDelay}ms\n`)

const consumer = new Consumer(manager, {
  queues,
  connection: 'redis',
  pollInterval: 100,
  monitor: {
    prefix: 'flux_console:', // Critical: match the prefix the Console looks for
  },
  workerOptions: {
    maxAttempts: 3,
  },
})

console.log('✅ Worker started. Monitoring enabled (check the Workers page in Console).')

consumer.start().catch((err) => {
  console.error('💥 Consumer Error:', err)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...')
  await consumer.stop()
  redis.disconnect()
  process.exit(0)
})
