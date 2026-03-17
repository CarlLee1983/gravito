import { describe, expect, it, mock } from 'bun:test'
import { MaintenanceScheduler } from '../src/server/services/MaintenanceScheduler'

describe('MaintenanceScheduler', () => {
  it('should unref initial and loop timers', async () => {
    const redis = {
      get: mock(async () => JSON.stringify({ autoCleanup: false, retentionDays: 7 })),
      set: mock(async () => 'OK'),
    }

    const scheduler = new MaintenanceScheduler(redis as any, async () => 0)
    const originalSetTimeout = global.setTimeout
    const originalClearTimeout = global.clearTimeout
    const timers: Array<{ unref: ReturnType<typeof mock> }> = []

    global.setTimeout = ((fn: () => void | Promise<void>) => {
      const handle = { unref: mock(() => {}) }
      timers.push(handle)

      if (timers.length === 1) {
        queueMicrotask(() => {
          void fn()
        })
      }

      return handle as any
    }) as unknown as typeof setTimeout

    global.clearTimeout = mock(() => {}) as unknown as typeof clearTimeout

    try {
      scheduler.start(1)
      for (let i = 0; i < 10 && timers.length < 2; i++) {
        await Promise.resolve()
      }

      expect(timers).toHaveLength(2)
      expect(timers[0].unref).toHaveBeenCalled()
      expect(timers[1].unref).toHaveBeenCalled()
    } finally {
      scheduler.stop()
      global.setTimeout = originalSetTimeout
      global.clearTimeout = originalClearTimeout
    }
  })

  it('should clear pending timers when stopped', () => {
    const redis = {
      get: mock(async () => null),
      set: mock(async () => 'OK'),
    }

    const scheduler = new MaintenanceScheduler(redis as any, async () => 0)
    const originalSetTimeout = global.setTimeout
    const originalClearTimeout = global.clearTimeout
    const clearTimeoutMock = mock(() => {})
    const timers = [{ unref: mock(() => {}) }, { unref: mock(() => {}) }]
    let index = 0

    global.setTimeout = ((_fn: () => void | Promise<void>) => {
      const handle = timers[index] ?? { unref: mock(() => {}) }
      index++
      return handle as any
    }) as unknown as typeof setTimeout

    global.clearTimeout = clearTimeoutMock as unknown as typeof clearTimeout

    try {
      scheduler.start(1)
      scheduler.stop()

      expect(clearTimeoutMock).toHaveBeenCalled()
    } finally {
      global.setTimeout = originalSetTimeout
      global.clearTimeout = originalClearTimeout
    }
  })
})
