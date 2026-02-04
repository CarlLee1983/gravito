import { describe, expect, it } from 'bun:test'
import type { DeadLetterEvent } from '../../../src/dlq/DeadLetterQueue'
import { MemoryDeadLetterQueue } from '../../../src/dlq/MemoryDeadLetterQueue'

function createTestEvent(overrides?: Partial<DeadLetterEvent>): DeadLetterEvent {
  return {
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
    ...overrides,
  }
}

describe('MemoryDeadLetterQueue', () => {
  it('should enqueue and peek events', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event = createTestEvent()

    await dlq.enqueue(event)
    const events = await dlq.peek()

    expect(events).toHaveLength(1)
    expect(events[0].failureReason).toBe('err')
  })

  it('should dequeue events', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event = createTestEvent()

    const id = await dlq.enqueue(event)
    await dlq.dequeue(id)

    const events = await dlq.peek()
    expect(events).toHaveLength(0)
  })

  it('should return correct size', async () => {
    const dlq = new MemoryDeadLetterQueue()

    expect(await dlq.size()).toBe(0)

    await dlq.enqueue(createTestEvent())
    expect(await dlq.size()).toBe(1)

    await dlq.enqueue(createTestEvent())
    expect(await dlq.size()).toBe(2)

    const id = await dlq.enqueue(createTestEvent())
    expect(await dlq.size()).toBe(3)

    await dlq.dequeue(id)
    expect(await dlq.size()).toBe(2)
  })

  it('should clear all events', async () => {
    const dlq = new MemoryDeadLetterQueue()

    await dlq.enqueue(createTestEvent())
    await dlq.enqueue(createTestEvent())
    await dlq.enqueue(createTestEvent())

    expect(await dlq.size()).toBe(3)

    await dlq.clear()

    expect(await dlq.size()).toBe(0)
    expect(await dlq.peek()).toHaveLength(0)
  })

  it('should generate UUID when event has no id', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event = createTestEvent()

    const id = await dlq.enqueue(event)

    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)

    // Verify the event was stored with the generated ID
    const events = await dlq.peek()
    expect(events[0].id).toBe(id)
  })

  it('should use provided event id', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const event = createTestEvent({ id: 'custom-id-123' })

    const id = await dlq.enqueue(event)

    expect(id).toBe('custom-id-123')

    const events = await dlq.peek()
    expect(events[0].id).toBe('custom-id-123')
  })

  it('should return events sorted by failedAt', async () => {
    const dlq = new MemoryDeadLetterQueue()

    const older = createTestEvent({ failedAt: new Date('2024-01-01T10:00:00Z') })
    const middle = createTestEvent({ failedAt: new Date('2024-01-02T10:00:00Z') })
    const newer = createTestEvent({ failedAt: new Date('2024-01-03T10:00:00Z') })

    // Enqueue in random order
    await dlq.enqueue(newer)
    await dlq.enqueue(older)
    await dlq.enqueue(middle)

    const events = await dlq.peek()

    expect(events).toHaveLength(3)
    expect(events[0].failedAt.getTime()).toBeLessThan(events[1].failedAt.getTime())
    expect(events[1].failedAt.getTime()).toBeLessThan(events[2].failedAt.getTime())
  })

  it('should respect peek limit', async () => {
    const dlq = new MemoryDeadLetterQueue()

    for (let i = 0; i < 15; i++) {
      await dlq.enqueue(createTestEvent())
    }

    const defaultPeek = await dlq.peek()
    expect(defaultPeek).toHaveLength(10) // default limit

    const limitedPeek = await dlq.peek(5)
    expect(limitedPeek).toHaveLength(5)

    const largeLimitPeek = await dlq.peek(20)
    expect(largeLimitPeek).toHaveLength(15) // only 15 events exist
  })
})
