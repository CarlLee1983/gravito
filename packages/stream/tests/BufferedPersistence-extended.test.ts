import { afterEach, describe, expect, it, mock } from 'bun:test'
import { BufferedPersistence } from '../src/persistence/BufferedPersistence'
import type { PersistenceAdapter, SerializedJob } from '../src/types'

function createMockAdapter(): PersistenceAdapter & {
  archiveMany?: any
  archiveLogMany?: any
} {
  return {
    archive: mock(() => Promise.resolve()),
    find: mock(() => Promise.resolve(null)),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    cleanup: mock(() => Promise.resolve(5)),
    archiveLog: mock(() => Promise.resolve()),
    listLogs: mock(() => Promise.resolve([])),
    countLogs: mock(() => Promise.resolve(0)),
    archiveMany: mock(() => Promise.resolve()),
    archiveLogMany: mock(() => Promise.resolve()),
  }
}

function createJob(id = 'j-1'): SerializedJob {
  return { id, type: 'json', data: '{}', createdAt: Date.now() }
}

describe('BufferedPersistence', () => {
  let bp: BufferedPersistence

  afterEach(() => {
    // 清理 timer
    if (bp) {
      ;(bp as any).flushTimer && clearTimeout((bp as any).flushTimer)
    }
  })

  describe('delegation (read operations)', () => {
    it('should delegate find to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.find('default', 'j-1')
      expect(adapter.find).toHaveBeenCalledWith('default', 'j-1')
    })

    it('should delegate list to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.list('default', { limit: 10 })
      expect(adapter.list).toHaveBeenCalledWith('default', { limit: 10 })
    })

    it('should delegate count to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.count('default', { status: 'completed' })
      expect(adapter.count).toHaveBeenCalledWith('default', { status: 'completed' })
    })

    it('should delegate cleanup to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      const result = await bp.cleanup(30)
      expect(adapter.cleanup).toHaveBeenCalledWith(30)
      expect(result).toBe(5)
    })

    it('should delegate listLogs to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.listLogs({ level: 'error' })
      expect(adapter.listLogs).toHaveBeenCalledWith({ level: 'error' })
    })

    it('should delegate countLogs to adapter', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.countLogs({ level: 'info' })
      expect(adapter.countLogs).toHaveBeenCalledWith({ level: 'info' })
    })
  })

  describe('archive (buffering)', () => {
    it('should buffer jobs', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archive('default', createJob(), 'completed')
      expect((bp as any).jobBuffer).toHaveLength(1)
      expect(adapter.archiveMany).not.toHaveBeenCalled()
    })

    it('should auto-flush when buffer reaches maxBufferSize', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 2, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'completed')

      // flush is called async, wait a bit
      await new Promise((r) => setTimeout(r, 10))
      expect(adapter.archiveMany).toHaveBeenCalled()
    })

    it('should start flush timer when below maxBufferSize', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 50 })

      await bp.archive('default', createJob(), 'completed')
      expect((bp as any).flushTimer).not.toBeNull()
    })
  })

  describe('archiveMany', () => {
    it('should delegate to adapter.archiveMany when available', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      const jobs = [{ queue: 'default', job: createJob(), status: 'completed' as const }]
      await bp.archiveMany(jobs)
      expect(adapter.archiveMany).toHaveBeenCalledWith(jobs)
    })

    it('should fallback to individual archive calls', async () => {
      const adapter = createMockAdapter()
      delete adapter.archiveMany
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      const jobs = [
        { queue: 'q1', job: createJob('j-1'), status: 'completed' as const },
        { queue: 'q2', job: createJob('j-2'), status: 'failed' as const },
      ]
      await bp.archiveMany(jobs)
      expect(adapter.archive).toHaveBeenCalledTimes(2)
    })
  })

  describe('archiveLog (buffering)', () => {
    it('should buffer logs', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archiveLog({
        level: 'info',
        message: 'test',
        workerId: 'w-1',
        timestamp: new Date(),
      })
      expect((bp as any).logBuffer).toHaveLength(1)
    })

    it('should auto-flush logs when buffer reaches maxBufferSize', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 2, flushInterval: 60000 })

      await bp.archiveLog({ level: 'info', message: 'a', workerId: 'w-1', timestamp: new Date() })
      await bp.archiveLog({ level: 'info', message: 'b', workerId: 'w-1', timestamp: new Date() })

      await new Promise((r) => setTimeout(r, 10))
      expect(adapter.archiveLogMany).toHaveBeenCalled()
    })
  })

  describe('archiveLogMany', () => {
    it('should delegate to adapter.archiveLogMany when available', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      const logs = [{ level: 'error', message: 'boom', workerId: 'w-1', timestamp: new Date() }]
      await bp.archiveLogMany(logs)
      expect(adapter.archiveLogMany).toHaveBeenCalledWith(logs)
    })

    it('should fallback to individual archiveLog calls', async () => {
      const adapter = createMockAdapter()
      delete adapter.archiveLogMany
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      const logs = [
        { level: 'info', message: 'a', workerId: 'w-1', timestamp: new Date() },
        { level: 'error', message: 'b', workerId: 'w-2', timestamp: new Date() },
      ]
      await bp.archiveLogMany(logs)
      expect(adapter.archiveLog).toHaveBeenCalledTimes(2)
    })
  })

  describe('flush', () => {
    it('should flush both jobs and logs', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      ;(bp as any).jobBuffer = [{ queue: 'default', job: createJob(), status: 'completed' }]
      ;(bp as any).logBuffer = [
        { level: 'info', message: 'test', workerId: 'w-1', timestamp: new Date() },
      ]

      await bp.flush()
      expect(adapter.archiveMany).toHaveBeenCalled()
      expect(adapter.archiveLogMany).toHaveBeenCalled()
    })

    it('should do nothing when buffers are empty', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100 })

      await bp.flush()
      expect(adapter.archiveMany).not.toHaveBeenCalled()
      expect(adapter.archiveLogMany).not.toHaveBeenCalled()
    })

    it('should fallback to individual calls when batch methods unavailable', async () => {
      const adapter = createMockAdapter()
      delete adapter.archiveMany
      delete adapter.archiveLogMany
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      ;(bp as any).jobBuffer = [{ queue: 'default', job: createJob(), status: 'completed' }]
      ;(bp as any).logBuffer = [
        { level: 'info', message: 'test', workerId: 'w-1', timestamp: new Date() },
      ]

      await bp.flush()
      expect(adapter.archive).toHaveBeenCalled()
      expect(adapter.archiveLog).toHaveBeenCalled()
    })

    it('should clear flush timer', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })
      ;(bp as any).flushTimer = setTimeout(() => {}, 100000)

      await bp.flush()
      expect((bp as any).flushTimer).toBeNull()
    })
  })

  describe('ensureFlushTimer', () => {
    it('should not create duplicate timers', async () => {
      const adapter = createMockAdapter()
      bp = new BufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 1000 })

      ;(bp as any).ensureFlushTimer()
      const timer1 = (bp as any).flushTimer

      ;(bp as any).ensureFlushTimer()
      const timer2 = (bp as any).flushTimer

      expect(timer1).toBe(timer2)
    })
  })
})
