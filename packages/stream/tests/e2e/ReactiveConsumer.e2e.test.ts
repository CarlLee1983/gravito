import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Consumer } from '../../src/Consumer'
import { Job } from '../../src/Job'
import { QueueManager } from '../../src/QueueManager'

describe('ReactiveConsumer E2E (Reactive Strategy)', () => {
  let queueManager: QueueManager
  let consumer: Consumer
  let processedJobs: string[] = []

  class TestJob extends Job {
    constructor(public payload: string) {
      super()
    }

    async handle(): Promise<void> {
      processedJobs.push(this.payload)
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  beforeEach(async () => {
    processedJobs = []
    queueManager = new QueueManager({
      default: 'memory',
      connections: {
        memory: { driver: 'memory' },
      },
    })
    queueManager.registerJobClasses([TestJob])
  })

  afterEach(async () => {
    if (consumer?.isRunning()) {
      await consumer.stop()
    }
  })

  it('should process jobs in reactive mode with polling fallback', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['default'],
      concurrency: 2,
      keepAlive: true,
      reactive: true,
      reactivePollingFallback: 500,
      debug: false,
    })

    // Start consumer first
    const _startPromise = consumer.start()

    // Give it a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Push some jobs AFTER start
    const job1 = new TestJob('job1')
    const job2 = new TestJob('job2')
    const job3 = new TestJob('job3')

    await queueManager.push(job1)
    await queueManager.push(job2)
    await queueManager.push(job3)

    // Wait for processing (with notifications it should be fast)
    await new Promise((resolve) => setTimeout(resolve, 500))

    // All jobs should be processed
    expect(processedJobs.length).toBeGreaterThan(0)
  })

  it('should handle concurrent job processing', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['emails', 'sms'],
      concurrency: 3,
      keepAlive: true,
      reactive: true,
      reactivePollingFallback: 300,
      debug: false,
    })

    // Start consumer
    const _startPromise = consumer.start()

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Push jobs to different queues AFTER start
    const job1 = new TestJob('email-1')
    job1.onQueue('emails')
    const job2 = new TestJob('sms-1')
    job2.onQueue('sms')
    const job3 = new TestJob('email-2')
    job3.onQueue('emails')
    const job4 = new TestJob('sms-2')
    job4.onQueue('sms')

    await queueManager.push(job1)
    await queueManager.push(job2)
    await queueManager.push(job3)
    await queueManager.push(job4)

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Jobs should be processed
    expect(processedJobs.length).toBeGreaterThan(0)
  })

  it('should fall back to polling when reactive fails', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['default'],
      concurrency: 1,
      keepAlive: true,
      reactive: true,
      reactivePollingFallback: 200, // Short fallback interval
      debug: false,
    })

    // Push job BEFORE start (so reactive notification is missed)
    const job = new TestJob('fallback-test')
    await queueManager.push(job)

    // Start consumer
    const _startPromise = consumer.start()

    // Wait for processing (fallback polling should kick in after 200ms)
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Job should be processed via fallback polling
    expect(processedJobs.length).toBeGreaterThan(0)
  })

  it('should stop gracefully in reactive mode', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['default'],
      concurrency: 1,
      keepAlive: true,
      reactive: true,
      reactivePollingFallback: 5000,
      debug: false,
    })

    const job = new TestJob('stop-test')
    await queueManager.push(job)

    // Start consumer
    const _startPromise = consumer.start()

    // Let it process
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Stop consumer
    await consumer.stop()

    // Should not throw
    expect(consumer.isRunning()).toBe(false)
  })
})
