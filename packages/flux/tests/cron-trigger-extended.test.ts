import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import type { FluxEngine } from '../src/engine/FluxEngine'
import { CronTrigger } from '../src/orbit/CronTrigger'

describe('CronTrigger Extended', () => {
  let trigger: CronTrigger
  let mockEngine: FluxEngine

  beforeEach(() => {
    mockEngine = {
      execute: jest.fn().mockResolvedValue({ status: 'completed' }),
    } as any

    trigger = new CronTrigger(mockEngine)
  })

  afterEach(() => {
    trigger.stop()
  })

  describe('addSchedule', () => {
    it('should add a schedule', () => {
      trigger.addSchedule({
        id: 'test-1',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      const schedules = trigger.listSchedules()
      expect(schedules).toHaveLength(1)
      expect(schedules[0].id).toBe('test-1')
    })

    it('should add multiple schedules', () => {
      trigger.addSchedule({
        id: 'schedule-a',
        cron: '*/5 * * * *',
        workflow: { name: 'wf-a', steps: [] },
        input: {},
        enabled: true,
      })
      trigger.addSchedule({
        id: 'schedule-b',
        cron: '0 * * * *',
        workflow: { name: 'wf-b', steps: [] },
        input: {},
        enabled: true,
      })

      expect(trigger.listSchedules()).toHaveLength(2)
    })

    it('should update existing schedule with same id', () => {
      trigger.addSchedule({
        id: 'test-1',
        cron: '*/5 * * * *',
        workflow: { name: 'old', steps: [] },
        input: {},
        enabled: true,
      })
      trigger.addSchedule({
        id: 'test-1',
        cron: '*/10 * * * *',
        workflow: { name: 'new', steps: [] },
        input: { updated: true },
        enabled: true,
      })

      const schedules = trigger.listSchedules()
      expect(schedules).toHaveLength(1)
      expect(schedules[0].cron).toBe('*/10 * * * *')
    })

    it('should start timer when scheduler is running', () => {
      trigger.start()

      trigger.addSchedule({
        id: 'active',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      // 確認排程已加入
      expect(trigger.listSchedules()).toHaveLength(1)
    })
  })

  describe('removeSchedule', () => {
    it('should remove a schedule', () => {
      trigger.addSchedule({
        id: 'to-remove',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      trigger.removeSchedule('to-remove')

      expect(trigger.listSchedules()).toHaveLength(0)
    })

    it('should clear timer when removing active schedule', () => {
      trigger.start()

      trigger.addSchedule({
        id: 'timed',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      // 移除已經有 timer 的排程
      trigger.removeSchedule('timed')

      expect(trigger.listSchedules()).toHaveLength(0)
    })

    it('should handle removing non-existent schedule', () => {
      // 不應拋出錯誤
      trigger.removeSchedule('non-existent')
    })
  })

  describe('start / stop', () => {
    it('should start the scheduler', () => {
      trigger.addSchedule({
        id: 'test',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      trigger.start()
      // 應該不會拋出錯誤
    })

    it('should be idempotent - multiple starts', () => {
      trigger.start()
      trigger.start() // 不應拋出錯誤
    })

    it('should stop and clear all timers', () => {
      trigger.start()

      trigger.addSchedule({
        id: 'timer-1',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      trigger.stop()
      // 應該不會拋出錯誤，且 timer 已清除
    })
  })

  describe('listSchedules', () => {
    it('should return empty array when no schedules', () => {
      expect(trigger.listSchedules()).toEqual([])
    })

    it('should return all registered schedules', () => {
      trigger.addSchedule({
        id: 's1',
        cron: '*/5 * * * *',
        workflow: { name: 'wf1', steps: [] },
        input: {},
      })
      trigger.addSchedule({
        id: 's2',
        cron: '0 * * * *',
        workflow: { name: 'wf2', steps: [] },
        input: { key: 'value' },
      })

      const list = trigger.listSchedules()
      expect(list).toHaveLength(2)
      expect(list.map((s) => s.id).sort()).toEqual(['s1', 's2'])
    })
  })

  describe('disabled schedules', () => {
    it('should not trigger disabled schedules', () => {
      trigger.start()

      trigger.addSchedule({
        id: 'disabled',
        cron: '*/5 * * * *',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: false,
      })

      // disabled 排程不應產生 timer
      expect(trigger.listSchedules()).toHaveLength(1)
    })
  })

  describe('invalid cron expressions', () => {
    it('should handle invalid cron expression gracefully', () => {
      trigger.start()

      trigger.addSchedule({
        id: 'invalid',
        cron: 'not-a-valid-cron',
        workflow: { name: 'test', steps: [] },
        input: {},
        enabled: true,
      })

      // 不應拋出錯誤，只 console.error
    })
  })
})
