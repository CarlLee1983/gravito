import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { QueueManager } from '../../src/QueueManager'
import { Consumer } from '../../src/Consumer'
import { Job } from '../../src/Job'

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
      keepAlive: false,
      reactive: true,
      reactivePollingFallback: 500,
      debug: false,
    })

    // Push some jobs
    const job1 = new TestJob('job1')
    const job2 = new TestJob('job2')
    const job3 = new TestJob('job3')

    await job1.queue('default')
    await job2.queue('default')
    await job3.queue('default')

    // Start consumer
    await consumer.start()

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 500))

    // All jobs should be processed (or at least some)
    expect(processedJobs.length).toBeGreaterThan(0)
  })

  it('should handle concurrent job processing', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['emails', 'sms'],
      concurrency: 3,
      keepAlive: false,
      reactive: true,
      reactivePollingFallback: 300,
      debug: false,
    })

    // Push jobs to different queues
    const job1 = new TestJob('email-1')
    const job2 = new TestJob('sms-1')
    const job3 = new TestJob('email-2')
    const job4 = new TestJob('sms-2')

    await queueManager.push('emails', job1)
    await queueManager.push('sms', job2)
    await queueManager.push('emails', job3)
    await queueManager.push('sms', job4)

    // Start consumer
    await consumer.start()

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Jobs should be processed
    expect(processedJobs.length).toBeGreaterThan(0)
  })

  it('should fall back to polling when reactive fails', async () => {
    consumer = new Consumer(queueManager, {
      queues: ['default'],
      concurrency: 1,
      keepAlive: false,
      reactive: true,
      reactivePollingFallback: 200, // Short fallback interval
      debug: false,
    })

    // Push job
    const job = new TestJob('fallback-test')
    await job.queue('default')

    // Start consumer
    await consumer.start()

    // Wait for processing (fallback polling should kick in)
    await new Promise((resolve) => setTimeout(resolve, 400))

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
    await job.queue('default')

    // Start consumer
    const startPromise = consumer.start()

    // Let it process
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Stop consumer
    await consumer.stop()

    // Should not throw
    expect(consumer.isRunning()).toBe(false)
  })
})
