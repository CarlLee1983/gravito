import { describe, expect, it, jest, mock } from 'bun:test'
import { CronParser } from '../src/CronParser'
import { CacheLockStore } from '../src/locks/CacheLockStore'
import { LockManager } from '../src/locks/LockManager'
import { MemoryLockStore } from '../src/locks/MemoryLockStore'
import { runProcess } from '../src/process/Process'
import { TaskSchedule } from '../src/TaskSchedule'

let cronShouldThrow = false
mock.module('cron-parser', () => ({
  default: {
    parseExpression: (_expr: string, options: { currentDate: Date }) => {
      if (cronShouldThrow) {
        throw new Error('boom')
      }
      return {
        next: () => ({
          toDate: () => new Date(options.currentDate.getTime() + 60000),
        }),
      }
    },
  },
}))

describe('CronParser', () => {
  it('calculates nextDate via cron-parser fallback', async () => {
    const current = new Date('2024-01-01T00:00:00Z')
    const next = await CronParser.nextDate('* * * * *', 'UTC', current)
    expect(next.getTime()).toBe(current.getTime() + 60000)
  })

  it('uses fallback cron-parser when expression is unsupported', async () => {
    const current = new Date('2024-01-01T00:00:00Z')
    const due = await CronParser.isDue('bad expression', 'UTC', current)
    expect(due).toBe(true)
  })

  it('returns false when cron-parser fails', async () => {
    cronShouldThrow = true
    const current = new Date('2024-01-01T00:00:00Z')
    const due = await CronParser.isDue('bad expression', 'UTC', current)
    expect(due).toBe(false)
    cronShouldThrow = false
  })
})

describe('TaskSchedule', () => {
  it('configures schedules via fluent api', () => {
    const schedule = new TaskSchedule('test', async () => {})
      .everyFiveMinutes()
      .hourlyAt(15)
      .dailyAt('02:30')
      .weeklyOn(1, '03:15')
      .monthlyOn(5, '04:45')
      .timezone('Asia/Taipei')
      .at('05:20')
      .onOneServer(120)
      .withoutOverlapping(90)
      .runInBackground()
      .onNode('worker')
      .setCommand('echo hello')
      .onSuccess(() => {})
      .onFailure(() => {})
      .description('test job')

    const task = schedule.getTask()
    expect(task.expression).toBe('20 5 5 * *')
    expect(task.timezone).toBe('Asia/Taipei')
    expect(task.shouldRunOnOneServer).toBe(true)
    expect(task.lockTtl).toBe(90)
    expect(task.background).toBe(true)
    expect(task.nodeRole).toBe('worker')
    expect(task.command).toBe('echo hello')
    expect(task.onSuccessCallbacks.length).toBe(1)
    expect(task.onFailureCallbacks.length).toBe(1)
  })
})

describe('Lock stores', () => {
  it('handles memory locks', async () => {
    const store = new MemoryLockStore()
    expect(await store.acquire('a', 1)).toBe(true)
    expect(await store.acquire('a', 1)).toBe(false)
    expect(await store.exists('a')).toBe(true)
    await store.release('a')
    expect(await store.exists('a')).toBe(false)
  })

  it('handles cache locks', async () => {
    const cache = {
      add: jest.fn(async () => true),
      forget: jest.fn(async () => {}),
      put: jest.fn(async () => {}),
      has: jest.fn(async () => true),
    }
    const store = new CacheLockStore(cache as any, 'test:')
    expect(await store.acquire('key', 1)).toBe(true)
    await store.forceAcquire('key', 1)
    await store.release('key')
    expect(await store.exists('key')).toBe(true)
  })

  it('uses lock manager with cache driver', async () => {
    const cache = {
      add: jest.fn(async () => true),
      forget: jest.fn(async () => {}),
      put: jest.fn(async () => {}),
      has: jest.fn(async () => false),
    }
    const manager = new LockManager('cache', { cache: cache as any })
    expect(await manager.acquire('job', 1)).toBe(true)
    await manager.forceAcquire('job', 1)
    await manager.release('job')
    expect(await manager.exists('job')).toBe(false)
  })
})

describe('Process', () => {
  it('runs a shell command and captures output', async () => {
    const result = await runProcess('printf "ok"')
    expect(result.success).toBe(true)
    expect(result.stdout).toBe('ok')
  })
})
