import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { AgendaBridge } from '../bridges/AgendaBridge'
import { BullBridge } from '../bridges/BullBridge'
import { GenericBridge } from '../bridges/GenericBridge'

describe('BullBridge', () => {
  let bridge: BullBridge
  let mockRedis: any
  let mockQueue: any

  beforeEach(() => {
    mockRedis = {
      publish: mock(() => Promise.resolve()),
      lpush: mock(() => Promise.resolve()),
      pipeline: mock(() => ({
        lpush: mock(() => {}),
        ltrim: mock(() => {}),
        exec: mock(() => Promise.resolve()),
      })),
    }
    bridge = new BullBridge(mockRedis, 'test:')
    mockQueue = {
      on: mock(() => {}),
      off: mock(() => {}),
    }
  })

  it('should attach listeners to queue', () => {
    bridge.attach(mockQueue)
    expect(mockQueue.on).toHaveBeenCalledTimes(4)
    expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function))
    expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function))
    expect(mockQueue.on).toHaveBeenCalledWith('active', expect.any(Function))
    expect(mockQueue.on).toHaveBeenCalledWith('progress', expect.any(Function))
  })
})

describe('AgendaBridge', () => {
  let bridge: AgendaBridge
  let mockRedis: any
  let mockAgenda: any

  beforeEach(() => {
    mockRedis = {
      publish: mock(() => Promise.resolve()),
      lpush: mock(() => Promise.resolve()),
      pipeline: mock(() => ({
        lpush: mock(() => {}),
        ltrim: mock(() => {}),
        exec: mock(() => Promise.resolve()),
      })),
    }
    bridge = new AgendaBridge(mockRedis, 'test:')
    mockAgenda = {
      on: mock(() => {}),
      off: mock(() => {}),
    }
  })

  it('should attach listeners to agenda', () => {
    bridge.attach(mockAgenda)
    expect(mockAgenda.on).toHaveBeenCalledTimes(3)
    expect(mockAgenda.on).toHaveBeenCalledWith('start', expect.any(Function))
    expect(mockAgenda.on).toHaveBeenCalledWith('complete', expect.any(Function))
    expect(mockAgenda.on).toHaveBeenCalledWith('fail', expect.any(Function))
  })
})

describe('GenericBridge', () => {
  let bridge: GenericBridge
  let mockRedis: any
  let mockEmitter: any

  beforeEach(() => {
    mockRedis = {
      publish: mock(() => Promise.resolve()),
      lpush: mock(() => Promise.resolve()),
      pipeline: mock(() => ({
        lpush: mock(() => {}),
        ltrim: mock(() => {}),
        exec: mock(() => Promise.resolve()),
      })),
    }
    mockEmitter = {
      on: mock(() => {}),
      off: mock(() => {}),
    }
  })

  it('should attach mapped listeners', () => {
    bridge = new GenericBridge(
      mockRedis,
      'test:',
      'worker-1',
      {
        started: 'job:start',
        completed: 'job:done',
        failed: 'job:fail',
      },
      'my-queue'
    )

    bridge.attach(mockEmitter)
    expect(mockEmitter.on).toHaveBeenCalledTimes(3)
    expect(mockEmitter.on).toHaveBeenCalledWith('job:start', expect.any(Function))
    expect(mockEmitter.on).toHaveBeenCalledWith('job:done', expect.any(Function))
    expect(mockEmitter.on).toHaveBeenCalledWith('job:fail', expect.any(Function))
  })
})
