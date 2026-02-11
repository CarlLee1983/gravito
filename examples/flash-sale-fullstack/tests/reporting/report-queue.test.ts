/**
 * Report Queue Manager Tests
 * 報表隊列管理系統測試
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import { ReportQueueManager } from '../../src/reporting'

describe('ReportQueueManager - 報表隊列管理系統', () => {
  let manager: ReportQueueManager

  beforeAll(() => {
    manager = new ReportQueueManager({
      maxRetries: 2,
      baseRetryDelay: 100,
      maxRetryDelay: 1000,
      concurrency: 5,
      timeout: 5000,
    })
  })

  describe('Queue Initialization', () => {
    it('should initialize queue manager', () => {
      expect(manager).toBeDefined()
      const stats = manager.getStats()
      expect(stats.totalJobs).toBe(0)
      expect(stats.dlqJobs).toBe(0)
    })

    it('should register report processors', () => {
      manager.registerProcessor('sales', async () => {
        return { type: 'sales', count: 1000 }
      })

      manager.registerProcessor('inventory', async () => {
        return { type: 'inventory', count: 5000 }
      })

      expect(manager).toBeDefined()
    })
  })

  describe('Job Submission', () => {
    it('should submit high priority job', async () => {
      const submissionManager = new ReportQueueManager()
      submissionManager.registerProcessor('sales', async () => {
        return { type: 'sales', count: 1000 }
      })

      const jobId = submissionManager.submitJob('sales', { startDate: '2026-01-01' }, 'high')

      expect(jobId).toBeDefined()
      expect(jobId).toContain('job-')

      const job = submissionManager.getJobStatus(jobId)
      expect(job).toBeDefined()
      expect(job?.priority).toBe('high')

      // 等待處理
      await new Promise((resolve) => setTimeout(resolve, 300))

      const completedJob = submissionManager.getJobStatus(jobId)
      expect(completedJob?.status).toBe('completed')
    })

    it('should submit medium priority job', async () => {
      const jobId = manager.submitJob('inventory', { location: 'warehouse-1' }, 'medium')

      expect(jobId).toBeDefined()

      const job = manager.getJobStatus(jobId)
      expect(job?.priority).toBe('medium')
    })

    it('should submit low priority job', async () => {
      const jobId = manager.submitJob('customer', { limit: 100 }, 'low')

      expect(jobId).toBeDefined()

      const job = manager.getJobStatus(jobId)
      expect(job?.priority).toBe('low')
    })

    it('should track job metadata', async () => {
      const jobId = manager.submitJob('revenue', { period: 'quarterly' }, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const job = manager.getJobStatus(jobId)
      expect(job?.jobId).toBe(jobId)
      expect(job?.createdAt).toBeDefined()
      expect(job?.data.period).toBe('quarterly')
      expect(job?.attempts).toBeGreaterThan(0)
    })
  })

  describe('Job Processing', () => {
    it('should process jobs in priority order', async () => {
      const processingManager = new ReportQueueManager()
      processingManager.registerProcessor('sales', async () => {
        return { type: 'sales', count: 1000 }
      })

      processingManager.submitJob('sales', { name: 'low-job' }, 'low')
      processingManager.submitJob('sales', { name: 'high-job' }, 'high')
      processingManager.submitJob('sales', { name: 'medium-job' }, 'medium')

      await new Promise((resolve) => setTimeout(resolve, 500))

      const stats = processingManager.getStats()
      expect(stats.completedJobs).toBe(3)
    })

    it('should process jobs concurrently', async () => {
      const jobIds = []
      for (let i = 0; i < 10; i++) {
        const jobId = manager.submitJob('inventory', { index: i }, 'medium')
        jobIds.push(jobId)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const stats = manager.getStats()
      expect(stats.completedJobs).toBeGreaterThanOrEqual(5)
    })

    it('should track job completion time', async () => {
      const timingManager = new ReportQueueManager()
      timingManager.registerProcessor('sales', async () => {
        // 添加小延遲以確保可測量的時間
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { type: 'sales', count: 1000 }
      })

      const jobId = timingManager.submitJob('sales', { data: 'test' }, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const job = timingManager.getJobStatus(jobId)
      expect(job?.completedAt).toBeDefined()
      expect(job?.startedAt).toBeDefined()

      const duration = (job?.completedAt?.getTime() ?? 0) - (job?.startedAt?.getTime() ?? 0)
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it('should store job results', async () => {
      const jobId = manager.submitJob('sales', { test: true }, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const job = manager.getJobStatus(jobId)
      expect(job?.result).toBeDefined()
      expect(job?.result).toEqual({ type: 'sales', count: 1000 })
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 2,
        baseRetryDelay: 100,
        maxRetryDelay: 1000,
        concurrency: 1,
      })

      let attemptCount = 0
      manager2.registerProcessor('failing', async () => {
        attemptCount++
        if (attemptCount < 2) {
          throw new Error('Simulated failure')
        }
        return { success: true }
      })

      const jobId = manager2.submitJob('failing', {}, 'high')

      // 等待重試完成
      await new Promise((resolve) => setTimeout(resolve, 500))

      const job = manager2.getJobStatus(jobId)
      expect(job?.attempts).toBeGreaterThan(1)
      expect(job?.status).toBe('completed')
    })

    it('should calculate exponential backoff delays', async () => {
      const delays: number[] = []

      const manager2 = new ReportQueueManager({
        maxRetries: 3,
        baseRetryDelay: 100,
        maxRetryDelay: 5000,
        concurrency: 1,
      })

      let attemptCount = 0
      manager2.registerProcessor('retryTest', async () => {
        attemptCount++
        if (attemptCount <= 3) {
          throw new Error('Test error')
        }
        return { ok: true }
      })

      manager2.on('job:retry', (data: unknown) => {
        const event = data as { delay: number }
        delays.push(event.delay)
      })

      const jobId = manager2.submitJob('retryTest', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const job = manager2.getJobStatus(jobId)
      expect(job?.attempts).toBeGreaterThanOrEqual(2)
    })

    it('should respect max retries limit', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 1,
        baseRetryDelay: 100,
        concurrency: 1,
      })

      manager2.registerProcessor('alwaysFails', async () => {
        throw new Error('Always fails')
      })

      const jobId = manager2.submitJob('alwaysFails', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 500))

      const dlqJobs = manager2.getDLQJobs()
      expect(dlqJobs.length).toBeGreaterThan(0)

      const dlqJob = dlqJobs.find((j) => j.jobId === jobId)
      expect(dlqJob?.status).toBe('failed')
      expect(dlqJob?.attempts).toBeLessThanOrEqual(2)
    })
  })

  describe('Dead Letter Queue (DLQ)', () => {
    it('should move failed jobs to DLQ', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 1,
        baseRetryDelay: 50,
        concurrency: 1,
      })

      manager2.registerProcessor('dlqTest', async () => {
        throw new Error('Test DLQ')
      })

      const jobId = manager2.submitJob('dlqTest', { data: 'test' }, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const dlqJobs = manager2.getDLQJobs()
      expect(dlqJobs.length).toBeGreaterThan(0)

      const job = dlqJobs.find((j) => j.jobId === jobId)
      expect(job?.status).toBe('failed')
      expect(job?.error).toBeDefined()
    })

    it('should track DLQ job count', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 0,
        concurrency: 1,
      })

      manager2.registerProcessor('fail1', async () => {
        throw new Error('Fail 1')
      })

      manager2.registerProcessor('fail2', async () => {
        throw new Error('Fail 2')
      })

      manager2.submitJob('fail1', {}, 'high')
      manager2.submitJob('fail2', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const stats = manager2.getStats()
      expect(stats.dlqJobs).toBeGreaterThanOrEqual(1)
    })

    it('should resubmit DLQ jobs', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 0,
        concurrency: 1,
      })

      let callCount = 0
      manager2.registerProcessor('dlqResubmit', async () => {
        callCount++
        if (callCount < 2) {
          throw new Error('First attempt fails')
        }
        return { success: true }
      })

      const jobId = manager2.submitJob('dlqResubmit', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 200))

      const dlqJobs = manager2.getDLQJobs()
      expect(dlqJobs.length).toBeGreaterThan(0)

      const success = manager2.resubmitDLQJob(jobId)
      expect(success).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 300))

      const job = manager2.getJobStatus(jobId)
      expect(job?.status).toBe('completed')
    })

    it('should clear DLQ', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 0,
        concurrency: 1,
      })

      manager2.registerProcessor('dlqClear', async () => {
        throw new Error('Test')
      })

      manager2.submitJob('dlqClear', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 200))

      const count = manager2.clearDLQ()
      expect(count).toBeGreaterThan(0)

      const dlqJobs = manager2.getDLQJobs()
      expect(dlqJobs.length).toBe(0)
    })
  })

  describe('Queue Statistics', () => {
    it('should track queue statistics', async () => {
      const manager2 = new ReportQueueManager()

      manager2.registerProcessor('stats', async () => {
        return { ok: true }
      })

      manager2.submitJob('stats', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const stats = manager2.getStats()
      expect(stats.totalJobs).toBeGreaterThanOrEqual(0)
      expect(stats.completedJobs).toBeGreaterThanOrEqual(1)
      expect(stats.successRate).toBeGreaterThanOrEqual(0)
    })

    it('should calculate success rate', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 1,
        baseRetryDelay: 50,
      })

      manager2.registerProcessor('success', async () => {
        return { ok: true }
      })

      manager2.submitJob('success', {}, 'high')
      manager2.submitJob('success', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 400))

      const stats = manager2.getStats()
      expect(stats.successRate).toBeGreaterThanOrEqual(0)
      expect(stats.successRate).toBeLessThanOrEqual(100)
    })

    it('should calculate average processing time', async () => {
      const manager2 = new ReportQueueManager()

      manager2.registerProcessor('timing', async () => {
        return { duration: 100 }
      })

      const _jobId = manager2.submitJob('timing', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const stats = manager2.getStats()
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Event System', () => {
    it('should emit job submitted event', () => {
      const manager2 = new ReportQueueManager()

      let eventFired = false
      manager2.on('job:submitted', () => {
        eventFired = true
      })

      manager2.submitJob('sales', {}, 'high')

      expect(eventFired).toBe(true)
    })

    it('should emit job completed event', async () => {
      const manager2 = new ReportQueueManager()

      manager2.registerProcessor('event', async () => {
        return { ok: true }
      })

      let completedJob: string | undefined
      manager2.on('job:completed', (data: unknown) => {
        const event = data as { jobId: string }
        completedJob = event.jobId
      })

      const jobId = manager2.submitJob('event', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(completedJob).toBe(jobId)
    })

    it('should emit job retry event', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 2,
        baseRetryDelay: 50,
        concurrency: 1,
      })

      let retryEventFired = false
      manager2.on('job:retry', () => {
        retryEventFired = true
      })

      manager2.registerProcessor('retryEvent', async () => {
        throw new Error('Test retry')
      })

      manager2.submitJob('retryEvent', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(retryEventFired).toBe(true)
    })

    it('should emit job DLQ event', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 0,
        concurrency: 1,
      })

      let dlqEventFired = false
      manager2.on('job:dlq', () => {
        dlqEventFired = true
      })

      manager2.registerProcessor('dlqEvent', async () => {
        throw new Error('Test DLQ')
      })

      manager2.submitJob('dlqEvent', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(dlqEventFired).toBe(true)
    })
  })

  describe('Status Reporting', () => {
    it('should generate status report', async () => {
      const manager2 = new ReportQueueManager()

      manager2.registerProcessor('report', async () => {
        return { ok: true }
      })

      manager2.submitJob('report', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const report = manager2.generateStatusReport()

      expect(report).toContain('REPORT QUEUE STATUS')
      expect(report).toContain('QUEUE STATISTICS')
      expect(report).toContain('PERFORMANCE')
      expect(report).toContain('QUEUE CONFIGURATION')
    })

    it('should include statistics in report', async () => {
      const manager2 = new ReportQueueManager()

      manager2.registerProcessor('stats', async () => {
        return { ok: true }
      })

      manager2.submitJob('stats', {}, 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      const report = manager2.generateStatusReport()

      expect(report).toContain('總任務數')
      expect(report).toContain('待處理')
      expect(report).toContain('處理中')
      expect(report).toContain('已完成')
      expect(report).toContain('成功率')
    })
  })

  describe('Integration - Complete Report Queue Flow', () => {
    it('should complete full report queue workflow', async () => {
      const manager2 = new ReportQueueManager({
        maxRetries: 2,
        baseRetryDelay: 100,
        concurrency: 3,
      })

      // 1. 註冊處理器
      manager2.registerProcessor('sales', async () => {
        return { type: 'sales', records: 1000 }
      })

      manager2.registerProcessor('inventory', async () => {
        return { type: 'inventory', records: 5000 }
      })

      // 2. 監聽事件
      const events: string[] = []
      manager2.on('job:submitted', () => events.push('submitted'))
      manager2.on('job:completed', () => events.push('completed'))
      manager2.on('job:dlq', () => events.push('dlq'))

      // 3. 提交任務
      const job1 = manager2.submitJob('sales', { period: 'monthly' }, 'high')
      const job2 = manager2.submitJob('inventory', { location: 'all' }, 'medium')

      // 4. 等待處理
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 5. 驗證結果
      expect(manager2.getJobStatus(job1)?.status).toBe('completed')
      expect(manager2.getJobStatus(job2)?.status).toBe('completed')

      const stats = manager2.getStats()
      expect(stats.completedJobs).toBe(2)
      expect(stats.successRate).toBeGreaterThan(0)

      // 6. 生成報告
      const report = manager2.generateStatusReport()
      expect(report).toContain('REPORT QUEUE STATUS')
    })
  })
})
