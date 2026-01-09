#!/usr/bin/env bun
import { Job, QueueManager } from '@gravito/stream'
import Redis from 'ioredis'

/**
 * Flux Console Unified Seed Script
 *
 * Usage:
 *   bun scripts/seed.ts [mode]
 *
 * Modes:
 *   standard  - Small set of diverse jobs (Waiting, Delayed, Failed)
 *   stress    - Many queues and many jobs for performance testing
 *   batch     - Setup for batch operation testing (100+ jobs)
 *   cron      - Register recurring schedules
 *   cleanup   - Flush Redis and clear logs
 */

const mode = process.argv[2] || 'standard'
const redis = new Redis('redis://localhost:6379')
const prefix = 'queue:'

// Simple Job class for testing
class GenericJob extends Job {
  constructor(
    id: any = null,
    public data: any = {}
  ) {
    super()
    this.id = id
  }
  async handle() {}
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

async function cleanup() {
  console.log('🧹 Cleaning up Redis...')
  const keys = await redis.keys(`${prefix}*`)
  const internalKeys = await redis.keys('flux_console:*')
  const allKeys = [...keys, ...internalKeys]

  if (allKeys.length > 0) {
    await redis.del(...allKeys)
  }
  console.log(`✅ Removed ${allKeys.length} keys.`)
}

async function seedStandard() {
  console.log('🚀 Seeding standard data...')

  // Orders Queue
  for (let i = 1; i <= 5; i++) {
    const job = new GenericJob(`ORD-${1000 + i}`, { amount: Math.random() * 100 })
    job.queueName = 'orders'
    await manager.push(job)
  }

  // Failed Jobs
  for (let i = 1; i <= 3; i++) {
    const jobInstance = new GenericJob(`FAIL-${i}`, { error: 'Payment Timeout' })
    jobInstance.queueName = 'orders'
    const serialized = manager.getSerializer().serialize(jobInstance)

    await redis.lpush(
      `${prefix}orders:failed`,
      JSON.stringify({
        ...serialized,
        status: 'failed',
        failedReason: 'Payment Timeout',
        failedAt: Date.now(),
      })
    )
  }

  // Delayed Jobs
  for (let i = 1; i <= 3; i++) {
    const job = new GenericJob(`DLY-${i}`, { type: 'reminder' })
    job.queueName = 'notifications'
    job.delay(3600 * 1000) // 1 hour
    await manager.push(job)
  }
}

async function seedStress() {
  console.log('🔥 Stress Mode: Creating 15 queues with jobs...')
  const queues = [
    'billing',
    'shipping',
    'inventory',
    'marketing',
    'crm',
    'auth',
    'logs',
    'backups',
    'indexing',
    'cache',
    'sync',
    'webhooks',
    'api',
    'metrics',
    'events',
  ]

  for (const q of queues) {
    const count = 10 + Math.floor(Math.random() * 40)
    for (let i = 0; i < count; i++) {
      const job = new GenericJob(`JOB-${q}-${i}`, { timestamp: Date.now() })
      job.queueName = q
      await manager.push(job)
    }
    console.log(`  - ${q}: ${count} jobs`)
  }
}

async function seedBatch() {
  console.log('📦 Batch Mode: Setting up specialized data for batch testing...')

  // 100 Waiting jobs
  for (let i = 1; i <= 100; i++) {
    const job = new GenericJob(`BATCH-WAIT-${i}`)
    job.queueName = 'test-batch'
    await manager.push(job)
  }

  // 50 Failed jobs
  for (let i = 1; i <= 50; i++) {
    const jobInstance = new GenericJob(`BATCH-FAIL-${i}`, { error: 'Database Connection Lost' })
    jobInstance.queueName = 'test-batch-fail'
    const serialized = manager.getSerializer().serialize(jobInstance)

    await redis.lpush(
      `${prefix}test-batch-fail:failed`,
      JSON.stringify({
        ...serialized,
        status: 'failed',
        attempts: 3,
        failedAt: Date.now(),
      })
    )
  }
}

async function seedCron() {
  console.log('⏰ Cron Mode: Registering recurring schedules...')
  const scheduler = manager.getScheduler()
  const serializer = manager.getSerializer()

  const rawSchedules = [
    { id: 'cleanup-tmp', cron: '*/1 * * * *', queue: 'system', name: 'CleanupTmp' },
    { id: 'daily-report', cron: '0 0 * * *', queue: 'reports', name: 'DailyReport' },
    { id: 'health-check', cron: '*/5 * * * *', queue: 'monitoring', name: 'HealthCheck' },
    { id: 'high-frequency', cron: '*/1 * * * *', queue: 'fast', name: 'Pulse' },
  ]

  for (const s of rawSchedules) {
    const jobInstance = new GenericJob(s.id, { task: s.name })
    jobInstance.queueName = s.queue
    const serialized = serializer.serialize(jobInstance)

    await scheduler.register({
      id: s.id,
      cron: s.cron,
      queue: s.queue,
      job: serialized,
    })
    console.log(`  - Registered: ${s.id} (${s.cron})`)
  }
}

async function main() {
  try {
    if (mode === 'cleanup') {
      await cleanup()
    } else if (mode === 'standard') {
      await cleanup()
      await seedStandard()
    } else if (mode === 'stress') {
      await seedStress()
    } else if (mode === 'batch') {
      await seedBatch()
    } else if (mode === 'cron') {
      await seedCron()
    } else if (mode === 'all') {
      await cleanup()
      await seedStandard()
      await seedStress()
      await seedBatch()
      await seedCron()
    } else {
      console.log('❌ Unknown mode. Try: standard, stress, batch, cron, cleanup, all')
    }
  } catch (err) {
    console.error('💥 Error:', err)
  } finally {
    redis.disconnect()
    console.log('\n🏁 Done.')
    process.exit(0)
  }
}

main()
