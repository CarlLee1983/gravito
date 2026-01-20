import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Consumer, Job, QueueManager } from '../src'

class SleepJob extends Job {
  static log: string[] = []

  constructor(
    public id = '',
    public duration = 0,
    public groupId?: string
  ) {
    super()
  }

  async handle() {
    SleepJob.log.push(`start:${this.id}`)
    await new Promise((resolve) => setTimeout(resolve, this.duration))
    SleepJob.log.push(`end:${this.id}`)
  }
}

describe('Consumer Concurrency', () => {
  let queue: QueueManager
  let consumer: Consumer

  beforeEach(() => {
    SleepJob.log = []

    queue = new QueueManager({
      default: 'memory',
      connections: {
        memory: { driver: 'memory' },
      },
      defaultSerializer: 'class',
    })

    // Cast to any to bypass strict constructor type check in tests
    queue.registerJobClasses([SleepJob as any])
  })

  afterEach(async () => {
    if (consumer) {
      await consumer.stop()
    }
  })

  it('should run non-grouped jobs concurrently', async () => {
    await queue.push(new SleepJob('A', 100))
    await queue.push(new SleepJob('B', 100))
    await queue.push(new SleepJob('C', 100))

    consumer = new Consumer(queue, {
      queues: ['default'],
      concurrency: 3,
      pollInterval: 10,
    })

    consumer.start()

    await new Promise((resolve) => setTimeout(resolve, 300))
    await consumer.stop()

    const log = SleepJob.log
    expect(log.length).toBe(6)

    const firstEndIndex = log.findIndex((l) => l.startsWith('end'))
    expect(firstEndIndex).toBeGreaterThanOrEqual(2)
  })

  it('should run grouped jobs sequentially', async () => {
    const jobA = new SleepJob('A', 50, 'group1')
    jobA.groupId = 'group1'
    const jobB = new SleepJob('B', 50, 'group1')
    jobB.groupId = 'group1'
    const jobC = new SleepJob('C', 50, 'group1')
    jobC.groupId = 'group1'

    await queue.push(jobA)
    await queue.push(jobB)
    await queue.push(jobC)

    consumer = new Consumer(queue, {
      queues: ['default'],
      concurrency: 3,
      pollInterval: 10,
      groupJobsSequential: true,
    })

    consumer.start()

    await new Promise((resolve) => setTimeout(resolve, 300))
    await consumer.stop()

    const log = SleepJob.log

    const aEnd = log.indexOf('end:A')
    const bStart = log.indexOf('start:B')
    const bEnd = log.indexOf('end:B')
    const cStart = log.indexOf('start:C')

    expect(aEnd).toBeLessThan(bStart)
    expect(bEnd).toBeLessThan(cStart)
  })

  it('should run mixed groups concurrently', async () => {
    const jA = new SleepJob('A', 100, 'g1')
    jA.groupId = 'g1'
    const jB = new SleepJob('B', 100, 'g1')
    jB.groupId = 'g1'
    const jC = new SleepJob('C', 100, 'g2')
    jC.groupId = 'g2'
    const jD = new SleepJob('D', 100, 'g2')
    jD.groupId = 'g2'

    await queue.push(jA)
    await queue.push(jC)
    await queue.push(jB)
    await queue.push(jD)

    consumer = new Consumer(queue, {
      queues: ['default'],
      concurrency: 4,
      pollInterval: 10,
    })

    consumer.start()

    await new Promise((resolve) => setTimeout(resolve, 400))
    await consumer.stop()

    const log = SleepJob.log

    const aStart = log.indexOf('start:A')
    const cStart = log.indexOf('start:C')
    const firstEnd = log.findIndex((l) => l.startsWith('end'))

    expect(aStart).toBeLessThan(firstEnd)
    expect(cStart).toBeLessThan(firstEnd)

    const aEnd = log.indexOf('end:A')
    const bStart = log.indexOf('start:B')
    expect(bStart).toBeGreaterThan(aEnd)

    const cEnd = log.indexOf('end:C')
    const dStart = log.indexOf('start:D')
    expect(dStart).toBeGreaterThan(cEnd)
  })
})
