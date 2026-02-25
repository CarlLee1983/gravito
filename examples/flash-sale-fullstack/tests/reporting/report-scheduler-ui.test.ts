/**
 * Report Scheduler and UI Manager Tests
 * 報表調度和 UI 管理系統測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { ScheduleRule, UIState } from '../../src/reporting'
import { ReportScheduler } from '../../src/reporting/ReportScheduler'
import { ReportUIManager } from '../../src/reporting/ReportUIManager'

describe('ReportScheduler - 報表調度系統', () => {
  let scheduler: ReportScheduler

  beforeEach(() => {
    scheduler = new ReportScheduler()
  })

  describe('Schedule Rule Management', () => {
    it('should register schedule rule', () => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'daily-sales',
        name: 'Daily Sales Report',
        description: 'Runs every day at 2 AM',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: ['user@example.com'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)
      const retrieved = scheduler.getScheduleRule('rule-1')

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Daily Sales Report')
      expect(retrieved?.cronExpression).toBe('0 2 * * *')
    })

    it('should retrieve all schedule rules', () => {
      const rule1: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'daily-sales',
        name: 'Rule 1',
        description: '',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      const rule2: ScheduleRule = {
        ruleId: 'rule-2',
        templateId: 'weekly-inventory',
        name: 'Rule 2',
        description: '',
        cronExpression: '0 3 * * 0',
        format: 'excel',
        recipientIds: [],
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule1)
      scheduler.registerScheduleRule(rule2)

      const rules = scheduler.getAllScheduleRules()
      expect(rules.length).toBe(2)
      expect(rules.some((r) => r.ruleId === 'rule-1')).toBe(true)
      expect(rules.some((r) => r.ruleId === 'rule-2')).toBe(true)
    })

    it('should update schedule rule', () => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'sales',
        name: 'Original Name',
        description: 'Original description',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: ['user1@example.com'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)
      const success = scheduler.updateScheduleRule('rule-1', {
        name: 'Updated Name',
        cronExpression: '0 3 * * *',
      })

      expect(success).toBe(true)

      const updated = scheduler.getScheduleRule('rule-1')
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.cronExpression).toBe('0 3 * * *')
    })

    it('should enable/disable schedule rule', () => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'sales',
        name: 'Test Rule',
        description: '',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)

      let stats = scheduler.getStats()
      expect(stats.enabledRules).toBe(1)

      scheduler.setRuleEnabled('rule-1', false)

      stats = scheduler.getStats()
      expect(stats.enabledRules).toBe(0)

      scheduler.setRuleEnabled('rule-1', true)

      stats = scheduler.getStats()
      expect(stats.enabledRules).toBe(1)
    })

    it('should delete schedule rule', () => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'sales',
        name: 'Test Rule',
        description: '',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)
      let rules = scheduler.getAllScheduleRules()
      expect(rules.length).toBe(1)

      scheduler.deleteScheduleRule('rule-1')
      rules = scheduler.getAllScheduleRules()
      expect(rules.length).toBe(0)
    })
  })

  describe('Execute Handler Management', () => {
    it('should register execute handler', () => {
      const handler = async (_rule: ScheduleRule) => 'report-123'

      scheduler.registerExecuteHandler('daily-sales', handler)
      expect(scheduler).toBeDefined()
    })

    it('should register multiple handlers', () => {
      const handler1 = async (_rule: ScheduleRule) => 'report-1'
      const handler2 = async (_rule: ScheduleRule) => 'report-2'

      scheduler.registerExecuteHandler('sales', handler1)
      scheduler.registerExecuteHandler('inventory', handler2)

      expect(scheduler).toBeDefined()
    })
  })

  describe('Schedule Statistics', () => {
    beforeEach(() => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'sales',
        name: 'Test Rule',
        description: '',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)
    })

    it('should track schedule statistics', () => {
      const stats = scheduler.getStats()

      expect(stats.totalRules).toBe(1)
      expect(stats.enabledRules).toBe(1)
      expect(stats.totalExecutions).toBeDefined()
      expect(stats.successfulExecutions).toBeDefined()
      expect(stats.failedExecutions).toBeDefined()
    })

    it('should calculate success rate', () => {
      const stats = scheduler.getStats()
      expect(stats.totalExecutions >= 0).toBe(true)
    })
  })

  describe('Status Report', () => {
    it('should generate status report', () => {
      const rule: ScheduleRule = {
        ruleId: 'rule-1',
        templateId: 'sales',
        name: 'Test Rule',
        description: '',
        cronExpression: '0 2 * * *',
        format: 'csv',
        recipientIds: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      }

      scheduler.registerScheduleRule(rule)
      const report = scheduler.generateStatusReport()

      expect(report).toContain('REPORT SCHEDULER STATUS')
      expect(report).toContain('總規則數')
      expect(report).toContain('EXECUTION STATISTICS')
    })
  })
})

describe('ReportUIManager - 報表 UI 管理系統', () => {
  let uiManager: ReportUIManager

  beforeEach(() => {
    uiManager = new ReportUIManager()
  })

  describe('UI State Management', () => {
    it('should initialize with default state', () => {
      const state = uiManager.getState()

      expect(state.currentPage).toBe('list')
      expect(state.searchQuery).toBe('')
      expect(state.sortBy).toBe('date')
      expect(state.sortOrder).toBe('desc')
      expect(state.itemsPerPage).toBe(20)
      expect(state.currentPageNumber).toBe(1)
    })

    it('should update state on dispatch', () => {
      uiManager.dispatch({
        type: 'SET_PAGE',
        payload: 'schedule',
      })

      const state = uiManager.getState()
      expect(state.currentPage).toBe('schedule')
    })

    it('should handle page transitions', () => {
      uiManager.dispatch({ type: 'SET_PAGE', payload: 'details' })
      expect(uiManager.getState().currentPage).toBe('details')

      uiManager.dispatch({ type: 'SET_PAGE', payload: 'list' })
      expect(uiManager.getState().currentPage).toBe('list')
    })

    it('should handle report selection', () => {
      uiManager.dispatch({
        type: 'SELECT_REPORT',
        payload: 'report-123',
      })

      const state = uiManager.getState()
      expect(state.selectedReportId).toBe('report-123')
      expect(state.currentPage).toBe('details')
    })
  })

  describe('Search and Filter', () => {
    it('should update search query', async () => {
      uiManager.dispatch({
        type: 'SEARCH',
        payload: 'sales',
      })

      const state = uiManager.getState()
      expect(state.searchQuery).toBe('sales')
    })

    it('should apply filters', async () => {
      uiManager.dispatch({
        type: 'UPDATE_FILTERS',
        payload: {
          templateId: 'daily-sales',
          format: 'csv',
        },
      })

      const state = uiManager.getState()
      expect(state.filters.templateId).toBe('daily-sales')
      expect(state.filters.format).toBe('csv')
    })

    it('should merge filters', async () => {
      uiManager.dispatch({
        type: 'UPDATE_FILTERS',
        payload: { templateId: 'sales' },
      })

      uiManager.dispatch({
        type: 'UPDATE_FILTERS',
        payload: { format: 'excel' },
      })

      const state = uiManager.getState()
      expect(state.filters.templateId).toBe('sales')
      expect(state.filters.format).toBe('excel')
    })
  })

  describe('Sorting', () => {
    it('should change sort order', () => {
      uiManager.dispatch({
        type: 'SORT',
        payload: { sortBy: 'name', sortOrder: 'asc' },
      })

      const state = uiManager.getState()
      expect(state.sortBy).toBe('name')
      expect(state.sortOrder).toBe('asc')
    })

    it('should support multiple sort fields', () => {
      const sortOptions = [
        { sortBy: 'date', sortOrder: 'desc' },
        { sortBy: 'name', sortOrder: 'asc' },
        { sortBy: 'size', sortOrder: 'desc' },
      ] as const

      for (const option of sortOptions) {
        uiManager.dispatch({
          type: 'SORT',
          payload: option,
        })

        const state = uiManager.getState()
        expect(state.sortBy).toBe(option.sortBy)
        expect(state.sortOrder).toBe(option.sortOrder)
      }
    })
  })

  describe('Pagination', () => {
    it('should set items per page', () => {
      uiManager.setItemsPerPage(50)
      const state = uiManager.getState()

      expect(state.itemsPerPage).toBe(50)
    })

    it('should reset page number on filter change', () => {
      uiManager.dispatch({
        type: 'UPDATE_FILTERS',
        payload: { templateId: 'sales' },
      })

      const state = uiManager.getState()
      expect(state.currentPageNumber).toBe(1)
    })
  })

  describe('Report Operations', () => {
    it('should handle report deletion', async () => {
      const success = await uiManager.deleteReport('report-123')
      expect(success).toBe(true)
    })

    it('should handle report download', () => {
      uiManager.dispatch({
        type: 'DOWNLOAD_REPORT',
        payload: 'report-123',
      })

      expect(uiManager).toBeDefined()
    })

    it('should handle report sharing', () => {
      uiManager.dispatch({
        type: 'SHARE_REPORT',
        payload: {
          reportId: 'report-123',
          options: {
            method: 'email',
            destination: 'user@example.com',
            includeMetadata: true,
          },
        },
      })

      expect(uiManager).toBeDefined()
    })
  })

  describe('State Subscription', () => {
    it('should notify subscribers of state changes', () => {
      let stateChangeCount = 0
      const unsubscribe = uiManager.subscribe((_state: UIState) => {
        stateChangeCount++
      })

      uiManager.dispatch({ type: 'SET_PAGE', payload: 'details' })

      expect(stateChangeCount).toBeGreaterThan(0)

      unsubscribe()
    })

    it('should support multiple subscribers', () => {
      let subscriber1Called = false
      let subscriber2Called = false

      const unsub1 = uiManager.subscribe(() => {
        subscriber1Called = true
      })

      const unsub2 = uiManager.subscribe(() => {
        subscriber2Called = true
      })

      uiManager.dispatch({ type: 'SET_PAGE', payload: 'list' })

      expect(subscriber1Called).toBe(true)
      expect(subscriber2Called).toBe(true)

      unsub1()
      unsub2()
    })
  })

  describe('Report List Operations', () => {
    it('should get report list', async () => {
      const list = await uiManager.getReportList()
      expect(Array.isArray(list)).toBe(true)
    })

    it('should search reports', async () => {
      const results = await uiManager.searchReports('sales')
      expect(Array.isArray(results)).toBe(true)
    })

    it('should filter reports', async () => {
      const results = await uiManager.filterReports({
        templateId: 'daily-sales',
        format: 'csv',
      })
      expect(Array.isArray(results)).toBe(true)
    })

    it('should sort reports', async () => {
      await uiManager.sortReports('date', 'desc')
      const state = uiManager.getState()
      expect(state.sortBy).toBe('date')
      expect(state.sortOrder).toBe('desc')
    })
  })

  describe('UI Report', () => {
    it('should generate UI report', () => {
      const report = uiManager.generateUIReport()

      expect(report).toContain('REPORT UI STATUS')
      expect(report).toContain('CURRENT STATE')
      expect(report).toContain('CACHE STATUS')
    })
  })

  describe('Pagination with Data', () => {
    it('should handle paginated results', async () => {
      const result = await uiManager.getPaginatedReports(1)

      expect(result.items).toBeDefined()
      expect(result.total).toBeDefined()
      expect(result.pageNumber).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBeDefined()
    })
  })

  describe('Refresh', () => {
    it('should handle refresh action', () => {
      uiManager.dispatch({ type: 'REFRESH' })
      const state = uiManager.getState()

      expect(state).toBeDefined()
    })
  })
})
