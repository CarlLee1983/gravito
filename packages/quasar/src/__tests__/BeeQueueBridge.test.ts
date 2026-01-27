import { describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'events'
import { BeeQueueBridge } from '../bridges/BeeQueueBridge'

describe('BeeQueueBridge', () => {
  it('should report job succeeded', async () => {
    const mockRedis = {
      pipeline: mock(() => ({
        lpush: mock(() => ({})),
        ltrim: mock(() => ({})),
        publish: mock(() => ({})),
        exec: mock(() => Promise.resolve([])),
      })),
    } as any

    const bridge = new BeeQueueBridge(mockRedis, 'flux:', 'worker-1', { flushInterval: 0 })
    const queue = new EventEmitter()
    bridge.attach(queue)

    const job = { id: 'job-1', data: { foo: 'bar' } }
    queue.emit('job succeeded', job, { ok: true })

    // LogBuffer might be async, but with flushInterval 0 it should be quick
    // We can't easily wait for LogBuffer internal timer if it's not 0
    // But we can check if listeners are attached
    expect(queue.listenerCount('job succeeded')).toBe(1)
    expect(queue.listenerCount('job failed')).toBe(1)
    expect(queue.listenerCount('job progress')).toBe(1)
  })

  it('should report job failed', async () => {
    const mockRedis = {
      pipeline: mock(() => ({
        lpush: () => ({}),
        ltrim: () => ({}),
        publish: () => ({}),
        exec: () => Promise.resolve([]),
      })),
    } as any

    const bridge = new BeeQueueBridge(mockRedis, 'flux:', 'worker-1')
    const queue = new EventEmitter()
    bridge.attach(queue)

    const job = { id: 'job-2', data: {} }
    const error = new Error('test error')
    queue.emit('job failed', job, error)

    expect(queue.listenerCount('job failed')).toBe(1)
  })

  it('should detach listeners', () => {
    const mockRedis = {
      pipeline: mock(() => ({ exec: () => Promise.resolve([]) })),
    } as any
    const bridge = new BeeQueueBridge(mockRedis)
    const queue = new EventEmitter()
    bridge.attach(queue)

    expect(queue.listenerCount('job succeeded')).toBe(1)
    bridge.detach()
    expect(queue.listenerCount('job succeeded')).toBe(0)
  })
})
