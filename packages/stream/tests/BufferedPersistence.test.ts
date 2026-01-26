import { describe, expect, it, mock } from 'bun:test'
import { BufferedPersistence } from '../src/persistence/BufferedPersistence'
import type { PersistenceAdapter, SerializedJob } from '../src/types'

describe('BufferedPersistence', () => {
  it('should buffer jobs and flush after limit', async () => {
    const mockAdapter = {
      archive: mock(() => Promise.resolve()),
      archiveMany: mock(() => Promise.resolve()),
      find: mock(() => Promise.resolve(null)),
      list: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      cleanup: mock(() => Promise.resolve(0)),
      archiveLog: mock(() => Promise.resolve()),
      archiveLogMany: mock(() => Promise.resolve()),
      listLogs: mock(() => Promise.resolve([])),
      countLogs: mock(() => Promise.resolve(0)),
    } as unknown as PersistenceAdapter

    const persistence = new BufferedPersistence(mockAdapter, {
      maxBufferSize: 3,
      flushInterval: 1000,
    })

    const job: SerializedJob = {
      id: '1',
      type: 'json',
      data: '{}',
      createdAt: Date.now(),
    }

    await persistence.archive('default', job, 'completed')
    await persistence.archive('default', job, 'completed')

    // Should not have called archiveMany yet
    expect(mockAdapter.archiveMany).not.toHaveBeenCalled()

    // Third one should trigger flush
    await persistence.archive('default', job, 'completed')

    // Should have called archiveMany with 3 jobs
    expect(mockAdapter.archiveMany).toHaveBeenCalled()
    expect(mockAdapter.archiveMany).toHaveBeenCalledTimes(1)

    // @ts-expect-error
    const calls = mockAdapter.archiveMany.mock.calls[0][0]
    expect(calls).toHaveLength(3)
  })

  it('should flush on manual flush call', async () => {
    const mockAdapter = {
      archiveMany: mock(() => Promise.resolve()),
      archive: mock(() => Promise.resolve()),
    } as unknown as PersistenceAdapter

    const persistence = new BufferedPersistence(mockAdapter, {
      maxBufferSize: 10,
      flushInterval: 50,
    })

    const job: SerializedJob = {
      id: '1',
      type: 'json',
      data: '{}',
      createdAt: Date.now(),
    }

    await persistence.archive('default', job, 'completed')
    expect(mockAdapter.archiveMany).not.toHaveBeenCalled()

    await persistence.flush()
    expect(mockAdapter.archiveMany).toHaveBeenCalled()
    // @ts-expect-error
    expect(mockAdapter.archiveMany.mock.calls[0][0]).toHaveLength(1)
  })

  it('should fallback to serial archive if archiveMany is missing', async () => {
    const mockAdapter = {
      archive: mock(() => Promise.resolve()),
      // archiveMany missing
    } as unknown as PersistenceAdapter

    const persistence = new BufferedPersistence(mockAdapter, {
      maxBufferSize: 2,
    })

    const job: SerializedJob = {
      id: '1',
      type: 'json',
      data: '{}',
      createdAt: Date.now(),
    }

    await persistence.archive('default', job, 'completed')
    await persistence.archive('default', job, 'completed') // triggers flush

    expect(mockAdapter.archive).toHaveBeenCalled()
    expect(mockAdapter.archive).toHaveBeenCalledTimes(2)
  })
})
