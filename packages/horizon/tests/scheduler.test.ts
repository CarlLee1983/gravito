import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { LockManager } from '../src/locks/LockManager'
import { SchedulerManager } from '../src/SchedulerManager'

describe('SchedulerManager', () => {
  let scheduler: SchedulerManager

  beforeEach(() => {
    const lockManager = new LockManager('memory')
    scheduler = new SchedulerManager(lockManager)
  })

  test('tasks can be scheduled with fluent api', () => {
    scheduler
      .task('test', () => {
        // Empty task for testing
      })
      .daily()
      .at('14:00')
    const tasks = scheduler.getTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].expression).toBe('0 14 * * *')
    expect(tasks[0].timezone).toBe('UTC')
  })

  test('executes task callback', async () => {
    const callback = mock(() => {})
    const task = scheduler.task('test', callback).everyMinute()

    await scheduler.runTask(task.getTask())
    expect(callback).toHaveBeenCalled()
  })

  test('respects memory lock (onOneServer)', async () => {
    const callback = mock(() => {})
    const task = scheduler.task('locked', callback).everyMinute().onOneServer()

    const lockManager = scheduler.lockManager

    // Use a fixed date for consistent lock key
    const testDate = new Date('2023-01-01T12:00:00Z')
    // Lock key format is task:{name}:{YYYYMMDDHHmm}
    const timestamp = '202301011200'
    const lockKey = `task:locked:${timestamp}`

    // Manually acquire lock to simulate another server
    await lockManager.acquire(lockKey, 60)

    await scheduler.runTask(task.getTask(), testDate)

    // Should NOT have run
    expect(callback).not.toHaveBeenCalled()

    // Release lock
    await lockManager.release(lockKey)

    // Should run now
    await scheduler.runTask(task.getTask(), testDate)
    expect(callback).toHaveBeenCalled()
  })

  test('run() processes due tasks', async () => {
    const callback = mock(() => {})
    scheduler.task('due-task', callback).everyMinute()

    // Mock date to be "due" (Run at 12:00, check at 12:00 -> should match * * * * *)
    const now = new Date('2023-01-01T12:00:00Z')
    await scheduler.run(now)

    expect(callback).toHaveBeenCalled()
  })
})
