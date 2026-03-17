import { afterEach, describe, expect, it } from 'bun:test'
import { ProgressTracker } from '../src/core/ProgressTracker'

describe('ProgressTracker', () => {
  const originalSetInterval = globalThis.setInterval

  afterEach(() => {
    globalThis.setInterval = originalSetInterval
  })

  it('should unref update timer so it does not keep the process alive', async () => {
    let unrefCalled = false

    globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetInterval(handler, timeout, ...args) as ReturnType<typeof setInterval>
      return Object.assign(timer, {
        unref: () => {
          unrefCalled = true
          return timer
        },
      })
    }) as unknown as typeof setInterval

    const storage = {
      set: async () => {},
      update: async () => {},
      get: async () => null,
      delete: async () => {},
    }

    const tracker = new ProgressTracker({
      storage,
      updateInterval: 1000,
    })

    await tracker.init('job-1', 10)
    await tracker.update(1)

    expect(unrefCalled).toBe(true)
    await tracker.complete()
  })
})
