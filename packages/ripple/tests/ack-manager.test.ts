import { afterEach, describe, expect, it } from 'bun:test'
import { AckManager } from '../src/reliability/AckManager'

describe('AckManager', () => {
  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  const originalSetTimeout = globalThis.setTimeout

  it('should unref ack timeout so it does not keep the process alive', () => {
    let unrefCalled = false

    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetTimeout(handler, timeout, ...args) as ReturnType<typeof setTimeout>
      return Object.assign(timer, {
        unref: () => {
          unrefCalled = true
          return timer
        },
      })
    }) as unknown as typeof setTimeout

    const manager = new AckManager({
      debug() {},
      info() {},
      warn() {},
      error() {},
    })

    manager.register('client-1', 1000)
    expect(unrefCalled).toBe(true)
  })
})
