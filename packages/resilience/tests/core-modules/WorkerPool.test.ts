import { afterEach, describe, expect, it, mock } from 'bun:test'
import { WorkerPool } from '../../src/worker/WorkerPool'

describe('WorkerPool', () => {
  afterEach(() => {
    mock.restore()
  })

  it('clears all interval timers on stop', async () => {
    const originalSetInterval = globalThis.setInterval
    const originalClearInterval = globalThis.clearInterval
    const handles = [
      { unref: mock(() => undefined), id: 'health' },
      { unref: mock(() => undefined), id: 'metrics' },
      { unref: mock(() => undefined), id: 'autoscaling' },
    ]
    const setIntervalMock = mock(() => handles.shift() as any)
    const clearIntervalMock = mock(() => {})
    globalThis.setInterval = setIntervalMock as any
    globalThis.clearInterval = clearIntervalMock as any

    try {
      const pool = new WorkerPool({
        enableAutoScaling: true,
        metricsInterval: 10,
      })

      await pool.start()
      await pool.stop()

      expect(setIntervalMock).toHaveBeenCalledTimes(3)
      expect(clearIntervalMock).toHaveBeenCalledTimes(3)
    } finally {
      globalThis.setInterval = originalSetInterval
      globalThis.clearInterval = originalClearInterval
    }
  })
})
