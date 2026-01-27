import { describe, expect, it } from 'bun:test'
import type { DeadLetterEvent } from '../../../src/dlq/DeadLetterQueue'
import { MemoryDeadLetterQueue } from '../../../src/dlq/MemoryDeadLetterQueue'

describe('MemoryDeadLetterQueue', () => {
  it('should enqueue and peek events', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event: DeadLetterEvent = {
      type: 'outgoing',
      originalEvent: {
        url: 'u',
        event: 'e',
        payload: {},
        createdAt: new Date(),
        status: 'failed',
        attempts: [],
      },
      failureReason: 'err',
      failedAt: new Date(),
      retryCount: 0,
    }

    await dlq.enqueue(event)
    const events = await dlq.peek()

    expect(events).toHaveLength(1)
    expect(events[0].failureReason).toBe('err')
  })

  it('should dequeue events', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event: DeadLetterEvent = {
      type: 'outgoing',
      originalEvent: {
        url: 'u',
        event: 'e',
        payload: {},
        createdAt: new Date(),
        status: 'failed',
        attempts: [],
      },
      failureReason: 'err',
      failedAt: new Date(),
      retryCount: 0,
    }

    const id = await dlq.enqueue(event)
    await dlq.dequeue(id)

    const events = await dlq.peek()
    expect(events).toHaveLength(0)
  })
})
