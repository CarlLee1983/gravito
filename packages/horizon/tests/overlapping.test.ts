import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { HookManager } from '@gravito/core'
import { LockManager } from '../src/locks/LockManager'
import { SchedulerManager } from '../src/SchedulerManager'

describe('Overlapping Control', () => {
  let scheduler: SchedulerManager
  let lockManager: LockManager
  let hooks: HookManager

  beforeEach(() => {
    lockManager = new LockManager('memory')
    // 建立簡單的 hooks mock
    hooks = {
      doAction: mock(async () => {}),
    } as any
    scheduler = new SchedulerManager(lockManager, undefined, hooks)
  })

  test('should skip execution when task is still running', async () => {
    const callback = mock(async () => {
      // 模擬長時間執行的任務
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const task = scheduler.task('long-running-task', callback).everyMinute().withoutOverlapping()

    const testDate = new Date('2023-01-01T12:00:00Z')
    const runningLockKey = 'task:running:long-running-task'

    // 第一次執行：取得鎖並開始執行（背景模式）
    await lockManager.forceAcquire(runningLockKey, 3600)

    // 第二次執行：應該被跳過（因為鎖已存在）
    await scheduler.runTask(task.getTask(), testDate)

    // 驗證任務未被執行
    expect(callback).not.toHaveBeenCalled()

    // 驗證 skipped hook 被觸發
    expect(hooks.doAction).toHaveBeenCalledWith('scheduler:task:skipped', {
      name: 'long-running-task',
      reason: 'overlapping',
      timestamp: testDate,
    })
  })

  test('should allow execution after previous task completes', async () => {
    let executionCount = 0
    const callback = mock(async () => {
      executionCount++
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const task = scheduler.task('sequential-task', callback).everyMinute().withoutOverlapping()

    const testDate1 = new Date('2023-01-01T12:00:00Z')
    const testDate2 = new Date('2023-01-01T12:01:00Z')

    // 第一次執行
    await scheduler.runTask(task.getTask(), testDate1)
    expect(executionCount).toBe(1)

    // 第二次執行（應該成功，因為第一次已完成）
    await scheduler.runTask(task.getTask(), testDate2)
    expect(executionCount).toBe(2)
  })

  test('should work with onOneServer() together', async () => {
    const callback = mock(() => {})

    const task = scheduler
      .task('combined-task', callback)
      .everyMinute()
      .onOneServer(300)
      .withoutOverlapping(3600)

    const testDate = new Date('2023-01-01T12:00:00Z')
    const timestamp = '202301011200'
    const timeLockKey = `task:combined-task:${timestamp}`
    const runningLockKey = 'task:running:combined-task'

    // 第一次執行：應該成功
    await scheduler.runTask(task.getTask(), testDate)
    expect(callback).toHaveBeenCalledTimes(1)

    // 驗證兩種鎖都存在
    const hasTimeLock = await lockManager.exists(timeLockKey)
    const hasRunningLock = await lockManager.exists(runningLockKey)
    expect(hasTimeLock).toBe(true)
    expect(hasRunningLock).toBe(false) // 應該已被釋放

    // 手動取得執行鎖，模擬任務仍在執行
    await lockManager.forceAcquire(runningLockKey, 3600)

    // 第二次執行：應該被 overlapping control 跳過
    const callback2 = mock(() => {})
    const task2 = scheduler
      .task('combined-task', callback2)
      .everyMinute()
      .onOneServer(300)
      .withoutOverlapping(3600)

    await scheduler.runTask(task2.getTask(), testDate)
    expect(callback2).not.toHaveBeenCalled()
  })

  test('should release lock after background task completes', async () => {
    let taskCompleted = false
    const callback = mock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      taskCompleted = true
    })

    const task = scheduler
      .task('background-task', callback)
      .everyMinute()
      .withoutOverlapping()
      .runInBackground()

    const testDate = new Date('2023-01-01T12:00:00Z')
    const runningLockKey = 'task:running:background-task'

    // 執行背景任務
    await scheduler.runTask(task.getTask(), testDate)

    // 立即檢查：鎖應該存在（任務仍在執行）
    const hasLockDuring = await lockManager.exists(runningLockKey)
    expect(hasLockDuring).toBe(true)

    // 等待任務完成
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 檢查：鎖應該已被釋放
    const hasLockAfter = await lockManager.exists(runningLockKey)
    expect(hasLockAfter).toBe(false)
    expect(taskCompleted).toBe(true)
  })

  test('should release lock on task failure', async () => {
    const callback = mock(async () => {
      throw new Error('Task failed')
    })

    const task = scheduler.task('failing-task', callback).everyMinute().withoutOverlapping()

    const testDate = new Date('2023-01-01T12:00:00Z')
    const runningLockKey = 'task:running:failing-task'

    // 執行應該拋出錯誤
    try {
      await scheduler.runTask(task.getTask(), testDate)
    } catch {
      // 預期的錯誤
    }

    // 檢查：鎖應該已被釋放
    const hasLock = await lockManager.exists(runningLockKey)
    expect(hasLock).toBe(false)
  })

  test('should keep running lock after timeout to avoid overlapping re-entry', async () => {
    let finished = false
    const callback = mock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
      finished = true
    })

    const task = scheduler
      .task('timed-out-task', callback)
      .everyMinute()
      .withoutOverlapping(1)
      .timeout(10)

    const testDate = new Date('2023-01-01T12:00:00Z')
    const runningLockKey = 'task:running:timed-out-task'

    await scheduler.runTask(task.getTask(), testDate)

    const hasLockImmediatelyAfterTimeout = await lockManager.exists(runningLockKey)
    expect(hasLockImmediatelyAfterTimeout).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(finished).toBe(true)
  })

  test('should use custom TTL for overlapping lock', async () => {
    const customTTL = 7200 // 2 hours
    const callback = mock(() => {})

    const task = scheduler
      .task('custom-ttl-task', callback)
      .everyMinute()
      .withoutOverlapping(customTTL)

    expect(task.getTask().overlappingExpiresAt).toBe(customTTL)
  })

  test('should release running lock if time lock acquisition fails', async () => {
    const callback = mock(() => {})

    const task = scheduler
      .task('dual-lock-task', callback)
      .everyMinute()
      .onOneServer(300)
      .withoutOverlapping(3600)

    const testDate = new Date('2023-01-01T12:00:00Z')
    const timestamp = '202301011200'
    const timeLockKey = `task:dual-lock-task:${timestamp}`
    const runningLockKey = 'task:running:dual-lock-task'

    // 預先取得時間鎖，模擬另一個伺服器已執行
    await lockManager.acquire(timeLockKey, 300)

    // 執行任務：應該失敗（無法取得時間鎖）
    await scheduler.runTask(task.getTask(), testDate)

    // 驗證任務未執行
    expect(callback).not.toHaveBeenCalled()

    // 驗證執行鎖已被釋放
    const hasRunningLock = await lockManager.exists(runningLockKey)
    expect(hasRunningLock).toBe(false)
  })

  test('withoutOverlapping() should not be alias of onOneServer()', () => {
    const task1 = scheduler
      .task('task1', () => {})
      .everyMinute()
      .withoutOverlapping()

    const task2 = scheduler
      .task('task2', () => {})
      .everyMinute()
      .onOneServer()

    const config1 = task1.getTask()
    const config2 = task2.getTask()

    // withoutOverlapping 應該設置不同的屬性
    expect(config1.preventOverlapping).toBe(true)
    expect(config1.overlappingExpiresAt).toBe(3600)
    expect(config1.shouldRunOnOneServer).toBe(false)

    // onOneServer 不應該影響 overlapping 相關屬性
    expect(config2.preventOverlapping).toBe(false)
    expect(config2.shouldRunOnOneServer).toBe(true)
  })
})
