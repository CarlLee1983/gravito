import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'node:events'
import { AgendaBridge } from '../bridges/AgendaBridge'
import { BullBridge } from '../bridges/BullBridge'
import { GenericBridge } from '../bridges/GenericBridge'

/**
 * 建立一個模擬 Redis 用戶端，支援 pipeline 操作。
 */
function createMockRedis() {
  return {
    publish: mock(() => Promise.resolve(1)),
    lpush: mock(() => Promise.resolve(1)),
    ltrim: mock(() => Promise.resolve('OK')),
    pipeline: mock(() => ({
      publish: mock(function (this: any) {
        return this
      }),
      lpush: mock(function (this: any) {
        return this
      }),
      ltrim: mock(function (this: any) {
        return this
      }),
      exec: mock(() => Promise.resolve([])),
    })),
  }
}

// ==========================================================
// AgendaBridge - 完整生命週期
// ==========================================================

describe('AgendaBridge lifecycle', () => {
  let bridge: AgendaBridge
  let mockRedis: any
  let mockAgenda: EventEmitter

  beforeEach(() => {
    mockRedis = createMockRedis()
    bridge = new AgendaBridge(mockRedis, 'test:', 'worker-1')
    mockAgenda = new EventEmitter()
  })

  afterEach(() => {
    bridge.detach()
  })

  it('should handle job start event', async () => {
    bridge.attach(mockAgenda)

    mockAgenda.emit('start', {
      attrs: {
        name: 'send-email',
        _id: { toString: () => 'agenda-job-1' },
        data: { to: 'user@test.com' },
      },
    })

    // 等待非同步 publishLog 完成
    await new Promise((resolve) => setTimeout(resolve, 50))

    // LogBuffer 應該有收到資料
    const buffer = (bridge as any).logBuffer
    expect(buffer).toBeDefined()
  })

  it('should handle job complete event', async () => {
    bridge.attach(mockAgenda)

    mockAgenda.emit('complete', {
      attrs: {
        name: 'send-email',
        _id: { toString: () => 'agenda-job-2' },
        result: { sent: true },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle job fail event', async () => {
    bridge.attach(mockAgenda)

    const error = new Error('SMTP connection failed')
    mockAgenda.emit('fail', error, {
      attrs: {
        name: 'send-email',
        _id: { toString: () => 'agenda-job-3' },
        data: { to: 'user@test.com' },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle jobs with missing attrs', async () => {
    bridge.attach(mockAgenda)

    mockAgenda.emit('start', { name: 'fallback-name', id: 'fallback-id' })
    mockAgenda.emit('complete', {})
    mockAgenda.emit('fail', new Error('fail'), {})

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should detach all listeners', () => {
    bridge.attach(mockAgenda)

    expect(mockAgenda.listenerCount('start')).toBe(1)
    expect(mockAgenda.listenerCount('complete')).toBe(1)
    expect(mockAgenda.listenerCount('fail')).toBe(1)

    bridge.detach()

    expect(mockAgenda.listenerCount('start')).toBe(0)
    expect(mockAgenda.listenerCount('complete')).toBe(0)
    expect(mockAgenda.listenerCount('fail')).toBe(0)
  })
})

// ==========================================================
// BullBridge - 完整生命週期
// ==========================================================

describe('BullBridge lifecycle', () => {
  let bridge: BullBridge
  let mockRedis: any
  let mockQueue: EventEmitter

  beforeEach(() => {
    mockRedis = createMockRedis()
    bridge = new BullBridge(mockRedis, 'test:', 'worker-1')
    mockQueue = new EventEmitter()
  })

  afterEach(() => {
    bridge.detach()
  })

  it('should handle active (job started) event', async () => {
    bridge.attach(mockQueue)

    mockQueue.emit('active', {
      id: 'bull-job-1',
      data: { action: 'process' },
      queue: { name: 'orders' },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle completed event', async () => {
    bridge.attach(mockQueue)

    mockQueue.emit(
      'completed',
      { id: 'bull-job-2', queue: { name: 'orders' } },
      { processed: true }
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle failed event', async () => {
    bridge.attach(mockQueue)

    const error = new Error('Processing failed')
    mockQueue.emit(
      'failed',
      {
        id: 'bull-job-3',
        data: { action: 'process' },
        queue: { name: 'orders' },
      },
      error
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle progress event', async () => {
    bridge.attach(mockQueue)

    mockQueue.emit('progress', { id: 'bull-job-4', queue: { name: 'orders' } }, 75)

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should detach all listeners', () => {
    bridge.attach(mockQueue)

    expect(mockQueue.listenerCount('completed')).toBe(1)
    expect(mockQueue.listenerCount('failed')).toBe(1)
    expect(mockQueue.listenerCount('active')).toBe(1)
    expect(mockQueue.listenerCount('progress')).toBe(1)

    bridge.detach()

    expect(mockQueue.listenerCount('completed')).toBe(0)
    expect(mockQueue.listenerCount('failed')).toBe(0)
    expect(mockQueue.listenerCount('active')).toBe(0)
    expect(mockQueue.listenerCount('progress')).toBe(0)
  })

  it('should handle jobs without queue name', async () => {
    bridge.attach(mockQueue)

    mockQueue.emit('active', { id: 'job-no-queue', data: {} })
    mockQueue.emit('completed', { id: 'job-no-queue' }, null)
    mockQueue.emit('failed', { id: 'job-no-queue', data: {} }, new Error('err'))
    mockQueue.emit('progress', { id: 'job-no-queue' }, 50)

    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})

// ==========================================================
// GenericBridge - 完整生命週期
// ==========================================================

describe('GenericBridge lifecycle', () => {
  let bridge: GenericBridge
  let mockRedis: any
  let mockEmitter: EventEmitter

  beforeEach(() => {
    mockRedis = createMockRedis()
    mockEmitter = new EventEmitter()
  })

  afterEach(() => {
    if (bridge) {
      bridge.detach()
    }
  })

  it('should map started event', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'task:begin',
        completed: 'task:done',
        failed: 'task:error',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    mockEmitter.emit('task:begin', { id: 'task-1', data: { type: 'email' } })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should map completed event', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        completed: 'task:done',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    mockEmitter.emit('task:done', { id: 'task-2' }, { result: 'success' })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should map failed event with Error object', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        failed: 'task:error',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    const error = new Error('Processing failed')
    mockEmitter.emit('task:error', { id: 'task-3' }, error)

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should map progress event', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        progress: 'task:progress',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    mockEmitter.emit('task:progress', { id: 'task-4' })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle emitter with addEventListener', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'start',
      },
      'custom-queue'
    )

    const customEmitter = {
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
    }

    bridge.attach(customEmitter)

    expect(customEmitter.addEventListener).toHaveBeenCalledWith('start', expect.any(Function))
  })

  it('should handle job without id', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'start',
        completed: 'done',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    // Job without id or _id
    mockEmitter.emit('start', {})
    mockEmitter.emit('done', {})

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle job with _id field', async () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'start',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    mockEmitter.emit('start', { _id: 'alt-id-1' })

    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should only attach listeners for configured events', () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'begin',
        // completed, failed, progress not configured
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    expect(mockEmitter.listenerCount('begin')).toBe(1)
    // Other events should not have listeners
  })

  it('should detach all listeners', () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'begin',
        completed: 'end',
        failed: 'error',
        progress: 'update',
      },
      'custom-queue'
    )

    bridge.attach(mockEmitter)

    expect(mockEmitter.listenerCount('begin')).toBe(1)
    expect(mockEmitter.listenerCount('end')).toBe(1)
    expect(mockEmitter.listenerCount('error')).toBe(1)
    expect(mockEmitter.listenerCount('update')).toBe(1)

    bridge.detach()

    expect(mockEmitter.listenerCount('begin')).toBe(0)
    expect(mockEmitter.listenerCount('end')).toBe(0)
    expect(mockEmitter.listenerCount('error')).toBe(0)
    expect(mockEmitter.listenerCount('update')).toBe(0)
  })
})

// ==========================================================
// BaseZenithBridge - setSampler
// ==========================================================

describe('BaseZenithBridge setSampler', () => {
  it('should update sampler on bridge and logBuffer', () => {
    const mockRedis = createMockRedis()
    const bridge = new BullBridge(mockRedis as any, 'test:', 'worker-1')

    const { LogSampler } = require('../utils/LogSampler')
    const newSampler = new LogSampler({ threshold: 1000 })

    bridge.setSampler(newSampler)

    expect((bridge as any).sampler).toBe(newSampler)
  })
})
