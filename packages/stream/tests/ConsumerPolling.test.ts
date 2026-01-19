import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { Consumer, Job, QueueManager } from '../src'

class TestJob extends Job {
  async handle() {}
}

describe('Consumer Polling & Batching', () => {
  let queue: QueueManager
  let consumer: Consumer

  beforeEach(() => {
    queue = new QueueManager({
      default: 'memory',
      connections: {
        memory: { driver: 'memory' },
      },
      defaultSerializer: 'class',
    })
    queue.registerJobClasses([TestJob as any])
  })

  afterEach(async () => {
    if (consumer) await consumer.stop()
  })

  it('should use popMany when batchSize > 1 and concurrency allows', async () => {
    const popManySpy = spyOn(queue, 'popMany')

    await queue.push(new TestJob())
    await queue.push(new TestJob())

    consumer = new Consumer(queue, {
      queues: ['default'],
      batchSize: 5,
      concurrency: 5,
      pollInterval: 10,
    })

    consumer.start()
    await new Promise((resolve) => setTimeout(resolve, 100))
    await consumer.stop()

    expect(popManySpy).toHaveBeenCalled()
  })

  it('should use popBlocking when enabled and batchSize <= 1', async () => {
    const mockDriver = {
      push: mock(() => Promise.resolve()),
      pop: mock(() => Promise.resolve(null)),
      // Simulate waiting
      popBlocking: mock(() => new Promise((resolve) => setTimeout(() => resolve(null), 10))),
      size: mock(() => Promise.resolve(0)),
    }
    // @ts-expect-error
    queue.drivers.set('mock', mockDriver)

    consumer = new Consumer(queue, {
      queues: ['default'],
      connection: 'mock',
      useBlocking: true,
      batchSize: 1,
      pollInterval: 10,
    })

    consumer.start()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await consumer.stop()

    expect(mockDriver.popBlocking).toHaveBeenCalled()
  })

  it('should fallback to pop when useBlocking is false', async () => {
    const mockDriver = {
      push: mock(() => Promise.resolve()),
      pop: mock(() => Promise.resolve(null)),
      popBlocking: mock(() => Promise.resolve(null)),
      size: mock(() => Promise.resolve(0)),
    }
    // @ts-expect-error
    queue.drivers.set('mock', mockDriver)

    consumer = new Consumer(queue, {
      queues: ['default'],
      connection: 'mock',
      useBlocking: false,
      batchSize: 1,
      pollInterval: 10,
    })

    consumer.start()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await consumer.stop()

    expect(mockDriver.popBlocking).not.toHaveBeenCalled()
    expect(mockDriver.pop).toHaveBeenCalled()
  })
})
