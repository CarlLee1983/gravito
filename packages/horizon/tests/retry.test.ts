import { describe, expect, it, mock } from 'bun:test'
import { LockManager } from '../src/locks'
import { SchedulerManager } from '../src/SchedulerManager'

describe('P3: Retry Mechanism', () => {
  it('should retry failed tasks up to the specified number of attempts', async () => {
    const lockManager = new LockManager('memory')
    const scheduler = new SchedulerManager(lockManager)

    let attemptCount = 0
    const failingTask = mock(async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error('Simulated failure')
      }
    })

    scheduler.task('retry-test', failingTask).everyMinute().retry(3, 10)

    await scheduler.run()

    // Wait for retries to complete (max 1s)
    const start = Date.now()
    while (attemptCount < 3 && Date.now() - start < 1000) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(attemptCount).toBe(3)
    expect(failingTask).toHaveBeenCalledTimes(3)
  })

  it('should respect retry delay between attempts', async () => {
    const lockManager = new LockManager('memory')
    const scheduler = new SchedulerManager(lockManager)

    const timestamps: number[] = []
    const failingTask = mock(async () => {
      timestamps.push(Date.now())
      throw new Error('Always fails')
    })

    scheduler.task('delay-test', failingTask).everyMinute().retry(2, 50)

    await scheduler.run()

    // Wait for retries to complete (max 1s)
    const start = Date.now()
    while (timestamps.length < 3 && Date.now() - start < 1000) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(timestamps.length).toBe(3)

    const delay1 = timestamps[1] - timestamps[0]
    const delay2 = timestamps[2] - timestamps[1]

    expect(delay1).toBeGreaterThanOrEqual(40)
    expect(delay2).toBeGreaterThanOrEqual(40)
  })

  it('should succeed on first retry if task recovers', async () => {
    const lockManager = new LockManager('memory')
    const scheduler = new SchedulerManager(lockManager)

    let attemptCount = 0
    const recoveringTask = mock(async () => {
      attemptCount++
      if (attemptCount === 1) {
        throw new Error('First attempt fails')
      }
    })

    scheduler.task('recover-test', recoveringTask).everyMinute().retry(3, 10)

    await scheduler.run()

    // Wait for retries to complete (max 1s)
    const start = Date.now()
    while (attemptCount < 2 && Date.now() - start < 1000) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(attemptCount).toBe(2)
    expect(recoveringTask).toHaveBeenCalledTimes(2)
  })

  it('should not retry if retries is set to 0', async () => {
    const lockManager = new LockManager('memory')
    const scheduler = new SchedulerManager(lockManager)

    let attemptCount = 0
    const failingTask = mock(async () => {
      attemptCount++
      throw new Error('Always fails')
    })

    scheduler.task('no-retry-test', failingTask).everyMinute().retry(0)

    await scheduler.run()

    // Wait for task to run (max 500ms)
    const start = Date.now()
    while (attemptCount < 1 && Date.now() - start < 500) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(attemptCount).toBe(1)
    expect(failingTask).toHaveBeenCalledTimes(1)
  })

  it('should validate retry parameters', () => {
    const lockManager = new LockManager('memory')
    const scheduler = new SchedulerManager(lockManager)

    expect(() => {
      scheduler
        .task('invalid-retry', async () => {})
        .everyMinute()
        .retry(-1)
    }).toThrow('Retry attempts must be non-negative')

    expect(() => {
      scheduler
        .task('invalid-delay', async () => {})
        .everyMinute()
        .retry(3, -100)
    }).toThrow('Retry delay must be non-negative')
  })

  it('should trigger scheduler:task:retry hook', async () => {
    const lockManager = new LockManager('memory')
    const hooks = { doAction: mock(async () => {}) }
    const scheduler = new SchedulerManager(lockManager, undefined, hooks as any)

    const failingTask = async () => {
      throw new Error('Fail')
    }

    scheduler.task('retry-hook-test', failingTask).everyMinute().retry(1, 10)

    await scheduler.run()

    // Wait for scheduler:task:retry hook to be called (max 1s)
    const start = Date.now()
    const hasRetryHook = () =>
      hooks.doAction.mock.calls.some((c) => c[0] === 'scheduler:task:retry')

    while (!hasRetryHook() && Date.now() - start < 1000) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(hooks.doAction).toHaveBeenCalledWith(
      'scheduler:task:retry',
      expect.objectContaining({
        name: 'retry-hook-test',
        attempt: 1,
        maxRetries: 1,
        delay: 10,
      })
    )
  })
})
