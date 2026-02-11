/**
 * Report Storage and Distribution Tests
 * 報表存儲和分發測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { Recipient } from '../../src/reporting/ReportDistributionManager'
import { ReportDistributionManager } from '../../src/reporting/ReportDistributionManager'
import { ReportStorageManager } from '../../src/reporting/ReportStorageManager'

describe('ReportStorageManager - 報表存儲管理器', () => {
  let storage: ReportStorageManager

  beforeEach(() => {
    storage = new ReportStorageManager({
      maxReportAge: 7 * 24 * 60 * 60 * 1000, // 7 days for testing
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000, // 1 minute
      enableVersioning: true,
    })
  })

  describe('Report Storage', () => {
    it('should store report with metadata', () => {
      const content = 'Date,Sales\n2026-01-01,5000\n2026-01-02,6000'

      const report = storage.storeReport(
        'report-1',
        'daily-sales',
        'Daily Sales Report',
        'Daily sales summary',
        'csv',
        content,
        2,
        ['finance', 'daily'],
        { period: '2026-01-01 to 2026-01-02' }
      )

      expect(report.reportId).toBe('report-1')
      expect(report.totalRecords).toBe(2)
      expect(report.tags).toContain('finance')
      expect(report.metadata.period).toBe('2026-01-01 to 2026-01-02')
    })

    it('should retrieve stored report', () => {
      const content = 'test data'
      storage.storeReport('report-2', 'sales', 'Test', 'Test report', 'csv', content, 1)

      const retrieved = storage.retrieveReport('report-2')
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe(content)
      expect(retrieved?.format).toBe('csv')
    })

    it('should handle multiple formats', () => {
      const csvContent = 'col1,col2\nval1,val2'
      const excelContent = '{"sheets": [{"data": [["col1", "col2"]]}]}'
      const jsonContent = '[{"col1": "val1"}]'

      storage.storeReport('report-csv', 'sales', 'CSV', '', 'csv', csvContent, 1)
      storage.storeReport('report-excel', 'sales', 'Excel', '', 'excel', excelContent, 1)
      storage.storeReport('report-json', 'sales', 'JSON', '', 'json', jsonContent, 1)

      expect(storage.retrieveReport('report-csv')?.format).toBe('csv')
      expect(storage.retrieveReport('report-excel')?.format).toBe('excel')
      expect(storage.retrieveReport('report-json')?.format).toBe('json')
    })

    it('should calculate file size correctly', () => {
      const content = 'Hello World!'
      const report = storage.storeReport('report-3', 'sales', 'Test', '', 'csv', content, 1)

      expect(report.fileSize).toBeGreaterThan(0)
    })
  })

  describe('Report Retrieval and Queries', () => {
    beforeEach(() => {
      storage.storeReport('r1', 'daily-sales', 'Report 1', '', 'csv', 'data1', 10)
      storage.storeReport('r2', 'daily-sales', 'Report 2', '', 'excel', 'data2', 20)
      storage.storeReport('r3', 'inventory', 'Report 3', '', 'json', 'data3', 30)
    })

    it('should query reports by template', () => {
      const results = storage.queryReports({ templateId: 'daily-sales' })
      expect(results.length).toBe(2)
      expect(results.every((r) => r.templateId === 'daily-sales')).toBe(true)
    })

    it('should query reports by format', () => {
      const results = storage.queryReports({ format: 'csv' })
      expect(results.length).toBe(1)
      expect(results[0].format).toBe('csv')
    })

    it('should query reports by tags', () => {
      storage.addReportTag('r1', 'important')
      storage.addReportTag('r3', 'important')

      const results = storage.queryReports({ tags: ['important'] })
      expect(results.length).toBe(2)
    })

    it('should support pagination', () => {
      const page1 = storage.queryReports({ limit: 2, offset: 0 })
      const page2 = storage.queryReports({ limit: 2, offset: 2 })

      expect(page1.length).toBe(2)
      expect(page2.length).toBe(1)
    })

    it('should sort by creation time (newest first)', () => {
      const results = storage.queryReports({})
      expect(results.length).toBe(3)
      expect(results[0].createdAt >= results[1].createdAt).toBe(true)
    })
  })

  describe('Tag Management', () => {
    it('should add tag to report', () => {
      storage.storeReport('report-4', 'sales', 'Test', '', 'csv', 'data', 1)
      const success = storage.addReportTag('report-4', 'archived')

      expect(success).toBe(true)
      const report = storage.retrieveReport('report-4')
      expect(report?.tags).toContain('archived')
    })

    it('should not duplicate tags', () => {
      storage.storeReport('report-5', 'sales', 'Test', '', 'csv', 'data', 1)
      storage.addReportTag('report-5', 'urgent')
      storage.addReportTag('report-5', 'urgent')

      const report = storage.retrieveReport('report-5')
      const tagCount = report?.tags.filter((t) => t === 'urgent').length
      expect(tagCount).toBe(1)
    })

    it('should remove tag from report', () => {
      storage.storeReport('report-6', 'sales', 'Test', '', 'csv', 'data', 1, ['temp'])
      const success = storage.removeReportTag('report-6', 'temp')

      expect(success).toBe(true)
      const report = storage.retrieveReport('report-6')
      expect(report?.tags).not.toContain('temp')
    })
  })

  describe('Metadata Management', () => {
    it('should update report metadata', () => {
      storage.storeReport('report-7', 'sales', 'Test', '', 'csv', 'data', 1, [], {
        version: 1,
      })

      storage.updateReportMetadata('report-7', { version: 2, status: 'reviewed' })

      const report = storage.retrieveReport('report-7')
      expect(report?.metadata.version).toBe(2)
      expect(report?.metadata.status).toBe('reviewed')
    })

    it('should merge metadata on update', () => {
      storage.storeReport('report-8', 'sales', 'Test', '', 'csv', 'data', 1, [], {
        field1: 'value1',
      })

      storage.updateReportMetadata('report-8', { field2: 'value2' })

      const report = storage.retrieveReport('report-8')
      expect(report?.metadata.field1).toBe('value1')
      expect(report?.metadata.field2).toBe('value2')
    })
  })

  describe('Report Expiration', () => {
    it('should set and retrieve expiration date', () => {
      storage.storeReport('report-9', 'sales', 'Test', '', 'csv', 'data', 1)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const success = storage.setReportExpiration('report-9', expiresAt)
      expect(success).toBe(true)

      const report = storage.retrieveReport('report-9')
      expect(report?.expiresAt).toBeDefined()
    })

    it('should handle non-existent report', () => {
      const success = storage.setReportExpiration('non-existent', new Date())
      expect(success).toBe(false)
    })
  })

  describe('Storage Statistics', () => {
    beforeEach(() => {
      storage.storeReport('r1', 'daily-sales', 'Report 1', '', 'csv', 'data1', 10)
      storage.storeReport('r2', 'daily-sales', 'Report 2', '', 'excel', 'data2', 20)
      storage.storeReport('r3', 'inventory', 'Report 3', '', 'json', 'data3', 30)
    })

    it('should calculate storage statistics', () => {
      const stats = storage.getStats()

      expect(stats.totalReports).toBe(3)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.averageReportSize).toBeGreaterThan(0)
    })

    it('should track reports by format', () => {
      const stats = storage.getStats()
      expect(stats.reportsByFormat.csv).toBe(1)
      expect(stats.reportsByFormat.excel).toBe(1)
      expect(stats.reportsByFormat.json).toBe(1)
    })

    it('should track reports by template', () => {
      const stats = storage.getStats()
      expect(stats.reportsByTemplate['daily-sales']).toBe(2)
      expect(stats.reportsByTemplate.inventory).toBe(1)
    })
  })

  describe('Report Deletion', () => {
    it('should delete report', () => {
      storage.storeReport('report-10', 'sales', 'Test', '', 'csv', 'data', 1)
      const success = storage.deleteReport('report-10')

      expect(success).toBe(true)
      expect(storage.retrieveReport('report-10')).toBeUndefined()
    })

    it('should update storage size on deletion', () => {
      storage.storeReport('report-11', 'sales', 'Test', '', 'csv', 'data', 1)
      const statsBefore = storage.getStats()

      storage.deleteReport('report-11')
      const statsAfter = storage.getStats()

      expect(statsAfter.totalReports).toBe(statsBefore.totalReports - 1)
    })
  })

  describe('Report Versioning', () => {
    it('should maintain multiple versions', () => {
      storage.storeReport('versioned', 'sales', 'Test', '', 'csv', 'data v1', 1)
      storage.storeReport('versioned', 'sales', 'Test', '', 'csv', 'data v2', 1)
      storage.storeReport('versioned', 'sales', 'Test', '', 'csv', 'data v3', 1)

      const versions = storage.getReportVersions('versioned')
      expect(versions.length).toBe(3)
    })
  })

  describe('Status Report', () => {
    it('should generate detailed status report', () => {
      storage.storeReport('r1', 'daily-sales', 'Report 1', '', 'csv', 'data', 10)
      const report = storage.generateStatusReport()

      expect(report).toContain('REPORT STORAGE STATUS')
      expect(report).toContain('總報表數')
      expect(report).toContain('REPORTS BY FORMAT')
    })
  })
})

describe('ReportDistributionManager - 報表分發管理器', () => {
  let distribution: ReportDistributionManager

  beforeEach(() => {
    distribution = new ReportDistributionManager({
      maxRetries: 2,
      baseRetryDelay: 100,
      maxRetryDelay: 1000,
      emailEnabled: true,
      webhookEnabled: true,
    })
  })

  describe('Recipient Management', () => {
    it('should register email recipient', () => {
      const recipient: Recipient = {
        id: 'user1',
        type: 'email',
        destination: 'user@example.com',
        name: 'User One',
        enabled: true,
        preferences: {
          formats: ['csv', 'excel'],
          frequency: 'daily',
          includeMetadata: true,
          notificationOnly: false,
        },
      }

      distribution.registerRecipient(recipient)
      const stats = distribution.getStats()
      expect(stats.totalRecipients).toBe(1)
      expect(stats.enabledRecipients).toBe(1)
    })

    it('should register multiple recipients', () => {
      const recipients: Recipient[] = [
        {
          id: 'user1',
          type: 'email',
          destination: 'user1@example.com',
          name: 'User 1',
          enabled: true,
          preferences: {
            formats: ['csv'],
            frequency: 'daily',
            includeMetadata: true,
            notificationOnly: false,
          },
        },
        {
          id: 'user2',
          type: 'email',
          destination: 'user2@example.com',
          name: 'User 2',
          enabled: true,
          preferences: {
            formats: ['excel'],
            frequency: 'weekly',
            includeMetadata: false,
            notificationOnly: true,
          },
        },
      ]

      for (const recipient of recipients) {
        distribution.registerRecipient(recipient)
      }

      const stats = distribution.getStats()
      expect(stats.totalRecipients).toBe(2)
    })

    it('should register webhook recipient', () => {
      const recipient: Recipient = {
        id: 'webhook1',
        type: 'webhook',
        destination: 'https://api.example.com/reports',
        name: 'API Webhook',
        enabled: true,
        preferences: {
          formats: ['json'],
          frequency: 'immediate',
          includeMetadata: true,
          notificationOnly: false,
        },
      }

      distribution.registerRecipient(recipient)
      const stats = distribution.getStats()
      expect(stats.totalRecipients).toBe(1)
    })
  })

  describe('Distribution Job Management', () => {
    beforeEach(() => {
      const recipient: Recipient = {
        id: 'user1',
        type: 'email',
        destination: 'user@example.com',
        name: 'User One',
        enabled: true,
        preferences: {
          formats: ['csv'],
          frequency: 'daily',
          includeMetadata: true,
          notificationOnly: false,
        },
      }
      distribution.registerRecipient(recipient)
    })

    it('should submit distribution job', async () => {
      const jobId = distribution.submitDistributionJob('report-1', 'csv content', 'report.csv')

      expect(jobId).toBeDefined()
      expect(jobId).toContain('dist-')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200))

      const job = distribution.getDistributionJobStatus(jobId)
      expect(job).toBeDefined()
    })

    it('should submit job with specific recipients', async () => {
      const jobId = distribution.submitDistributionJob('report-2', 'excel content', 'report.xlsx', [
        'user1',
      ])

      expect(jobId).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 200))

      const job = distribution.getDistributionJobStatus(jobId)
      expect(job?.recipients.length).toBe(1)
    })
  })

  describe('Recipient Control', () => {
    it('should enable/disable recipient', () => {
      const recipient: Recipient = {
        id: 'user1',
        type: 'email',
        destination: 'user@example.com',
        name: 'User One',
        enabled: true,
        preferences: {
          formats: ['csv'],
          frequency: 'daily',
          includeMetadata: true,
          notificationOnly: false,
        },
      }

      distribution.registerRecipient(recipient)

      const statsBefore = distribution.getStats()
      expect(statsBefore.enabledRecipients).toBe(1)

      distribution.setRecipientEnabled('user1', false)

      const statsAfter = distribution.getStats()
      expect(statsAfter.enabledRecipients).toBe(0)
    })
  })

  describe('Distribution Handlers', () => {
    it('should register distribution handler', () => {
      const emailHandler = async (recipient: Recipient, _content: string, name: string) => {
        // Mock email sending
        console.log(`Sending ${name} to ${recipient.destination}`)
      }

      distribution.registerDistributionHandler('email', emailHandler)
      expect(distribution).toBeDefined()
    })

    it('should register multiple handlers', () => {
      const emailHandler = async () => {
        // Mock email handler
      }
      const webhookHandler = async () => {
        // Mock webhook handler
      }

      distribution.registerDistributionHandler('email', emailHandler)
      distribution.registerDistributionHandler('webhook', webhookHandler)

      expect(distribution).toBeDefined()
    })
  })

  describe('Distribution Statistics', () => {
    it('should track distribution statistics', () => {
      const stats = distribution.getStats()

      expect(stats.totalJobs).toBeDefined()
      expect(stats.pendingJobs).toBeDefined()
      expect(stats.completedJobs).toBeDefined()
      expect(stats.successRate).toBeDefined()
    })

    it('should calculate success rate', () => {
      const stats = distribution.getStats()
      expect(stats.successRate).toBeGreaterThanOrEqual(0)
      expect(stats.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Job Status Tracking', () => {
    beforeEach(() => {
      const recipient: Recipient = {
        id: 'user1',
        type: 'email',
        destination: 'user@example.com',
        name: 'User One',
        enabled: true,
        preferences: {
          formats: ['csv'],
          frequency: 'daily',
          includeMetadata: true,
          notificationOnly: false,
        },
      }
      distribution.registerRecipient(recipient)
    })

    it('should query distribution jobs by report', async () => {
      const jobId = distribution.submitDistributionJob('report-test', 'content', 'file.csv')

      await new Promise((resolve) => setTimeout(resolve, 200))

      const jobs = distribution.queryDistributionJobs('report-test')
      expect(jobs.length).toBeGreaterThan(0)
      expect(jobs.some((j) => j.jobId === jobId)).toBe(true)
    })

    it('should track job creation time', async () => {
      const before = Date.now()
      const jobId = distribution.submitDistributionJob('report-3', 'content', 'file.csv')
      const after = Date.now()

      const job = distribution.getDistributionJobStatus(jobId)
      expect(job?.createdAt.getTime()).toBeGreaterThanOrEqual(before)
      expect(job?.createdAt.getTime()).toBeLessThanOrEqual(after)
    })
  })

  describe('Status Report', () => {
    it('should generate status report', () => {
      const report = distribution.generateStatusReport()

      expect(report).toContain('REPORT DISTRIBUTION STATUS')
      expect(report).toContain('DISTRIBUTION STATISTICS')
      expect(report).toContain('RECIPIENT STATISTICS')
    })
  })
})
