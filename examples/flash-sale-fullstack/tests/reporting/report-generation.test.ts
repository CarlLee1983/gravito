/**
 * Report Generation Engine Tests
 * 報表生成引擎測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type {
  ReportField,
  ReportGenerationConfig,
  ReportTemplate,
} from '../../src/reporting/ReportGenerationEngine'
import { ReportGenerationEngine } from '../../src/reporting/ReportGenerationEngine'

describe('ReportGenerationEngine - 報表生成引擎', () => {
  let engine: ReportGenerationEngine

  beforeEach(() => {
    engine = new ReportGenerationEngine()
  })

  describe('Template Management', () => {
    it('should register report template', () => {
      const template: ReportTemplate = {
        templateId: 'sales-daily',
        name: 'Daily Sales Report',
        description: '每日銷售報表',
        type: 'daily',
        fields: [
          {
            fieldId: 'date',
            name: 'date',
            label: '日期',
            type: 'date',
          },
          {
            fieldId: 'totalSales',
            name: 'totalSales',
            label: '總銷售額',
            type: 'currency',
          },
        ],
      }

      engine.registerTemplate(template)
      const retrieved = engine.getTemplate('sales-daily')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Daily Sales Report')
    })

    it('should retrieve all templates', () => {
      const template1: ReportTemplate = {
        templateId: 'template-1',
        name: 'Template 1',
        description: 'First template',
        type: 'sales',
        fields: [{ fieldId: 'f1', name: 'f1', label: 'Field 1', type: 'string' }],
      }

      const template2: ReportTemplate = {
        templateId: 'template-2',
        name: 'Template 2',
        description: 'Second template',
        type: 'inventory',
        fields: [{ fieldId: 'f2', name: 'f2', label: 'Field 2', type: 'number' }],
      }

      engine.registerTemplate(template1)
      engine.registerTemplate(template2)

      const templates = engine.getTemplates()
      expect(templates.length).toBe(2)
      expect(templates.map((t) => t.templateId)).toContain('template-1')
      expect(templates.map((t) => t.templateId)).toContain('template-2')
    })

    it('should retrieve template fields', () => {
      const fields: ReportField[] = [
        { fieldId: 'id', name: 'id', label: 'ID', type: 'string' },
        { fieldId: 'amount', name: 'amount', label: '金額', type: 'currency' },
        { fieldId: 'percentage', name: 'percentage', label: '比例', type: 'percentage' },
      ]

      const template: ReportTemplate = {
        templateId: 'complex',
        name: 'Complex Report',
        description: 'Report with multiple field types',
        type: 'custom',
        fields,
      }

      engine.registerTemplate(template)
      const retrievedFields = engine.getTemplateFields('complex')

      expect(retrievedFields.length).toBe(3)
      expect(retrievedFields[0].type).toBe('string')
      expect(retrievedFields[1].type).toBe('currency')
      expect(retrievedFields[2].type).toBe('percentage')
    })
  })

  describe('Data Provider Management', () => {
    it('should register data provider', () => {
      const template: ReportTemplate = {
        templateId: 'sales',
        name: 'Sales Report',
        description: 'Sales data report',
        type: 'sales',
        fields: [{ fieldId: 'sales', name: 'sales', label: 'Sales', type: 'number' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('sales', async () => {
        return [{ sales: 1000 }, { sales: 2000 }]
      })

      expect(engine).toBeDefined()
    })

    it('should support filtered data provider', async () => {
      const template: ReportTemplate = {
        templateId: 'inventory',
        name: 'Inventory Report',
        description: 'Inventory data',
        type: 'inventory',
        fields: [
          { fieldId: 'location', name: 'location', label: '位置', type: 'string' },
          { fieldId: 'stock', name: 'stock', label: '庫存', type: 'number' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('inventory', async (filters) => {
        if (filters?.some((f) => f.field === 'location' && f.value === 'warehouse-1')) {
          return [{ location: 'warehouse-1', stock: 5000 }]
        }
        return [
          { location: 'warehouse-1', stock: 5000 },
          { location: 'warehouse-2', stock: 3000 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'inventory',
        format: 'json',
        filters: [{ field: 'location', operator: 'eq', value: 'warehouse-1' }],
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.totalRecords).toBe(1)
    })
  })

  describe('CSV Report Generation', () => {
    it('should generate CSV report', async () => {
      const template: ReportTemplate = {
        templateId: 'csv-test',
        name: 'CSV Test',
        description: 'CSV test report',
        type: 'custom',
        fields: [
          { fieldId: 'name', name: 'name', label: 'Name', type: 'string' },
          { fieldId: 'amount', name: 'amount', label: 'Amount', type: 'currency' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('csv-test', async () => {
        return [
          { name: 'Product A', amount: 100.5 },
          { name: 'Product B', amount: 200.75 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'csv-test',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.format).toBe('csv')
      expect(result.totalRecords).toBe(2)
      expect(result.fileSize).toBeGreaterThan(0)
    })

    it('should escape special characters in CSV', async () => {
      const template: ReportTemplate = {
        templateId: 'csv-escape',
        name: 'CSV Escape Test',
        description: 'Test CSV escaping',
        type: 'custom',
        fields: [
          { fieldId: 'description', name: 'description', label: 'Description', type: 'string' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('csv-escape', async () => {
        return [
          { description: 'Product with, comma' },
          { description: 'Product with "quotes"' },
          { description: 'Product with\nnewline' },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'csv-escape',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.totalRecords).toBe(3)
    })

    it('should support CSV encoding option', async () => {
      const template: ReportTemplate = {
        templateId: 'csv-encoding',
        name: 'CSV Encoding Test',
        description: 'Test CSV encoding',
        type: 'custom',
        fields: [{ fieldId: 'text', name: 'text', label: 'Text', type: 'string' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('csv-encoding', async () => {
        return [{ text: 'Hello 世界' }]
      })

      const config: ReportGenerationConfig = {
        templateId: 'csv-encoding',
        format: 'csv',
        encoding: 'utf-8',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })
  })

  describe('Excel Report Generation', () => {
    it('should generate Excel report in JSON format', async () => {
      const template: ReportTemplate = {
        templateId: 'excel-test',
        name: 'Excel Test',
        description: 'Excel test report',
        type: 'custom',
        fields: [
          { fieldId: 'id', name: 'id', label: 'ID', type: 'string' },
          { fieldId: 'revenue', name: 'revenue', label: 'Revenue', type: 'currency' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('excel-test', async () => {
        return [
          { id: 'SKU001', revenue: 1500.0 },
          { id: 'SKU002', revenue: 2500.0 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'excel-test',
        format: 'excel',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.format).toBe('excel')
      expect(result.fileName).toContain('.xlsx')
    })
  })

  describe('JSON Report Generation', () => {
    it('should generate JSON report', async () => {
      const template: ReportTemplate = {
        templateId: 'json-test',
        name: 'JSON Test',
        description: 'JSON test report',
        type: 'custom',
        fields: [
          { fieldId: 'date', name: 'date', label: 'Date', type: 'date' },
          { fieldId: 'value', name: 'value', label: 'Value', type: 'number' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('json-test', async () => {
        return [
          { date: new Date('2026-01-01'), value: 100 },
          { date: new Date('2026-01-02'), value: 200 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'json-test',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
      expect(result.totalRecords).toBe(2)
    })
  })

  describe('Data Type Formatting', () => {
    it('should format currency type', async () => {
      const template: ReportTemplate = {
        templateId: 'currency-format',
        name: 'Currency Format',
        description: 'Test currency formatting',
        type: 'custom',
        fields: [{ fieldId: 'amount', name: 'amount', label: 'Amount', type: 'currency' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('currency-format', async () => {
        return [{ amount: 1234.5678 }, { amount: 999.99 }]
      })

      const config: ReportGenerationConfig = {
        templateId: 'currency-format',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })

    it('should format percentage type', async () => {
      const template: ReportTemplate = {
        templateId: 'percentage-format',
        name: 'Percentage Format',
        description: 'Test percentage formatting',
        type: 'custom',
        fields: [{ fieldId: 'rate', name: 'rate', label: 'Rate', type: 'percentage' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('percentage-format', async () => {
        return [{ rate: 0.856 }, { rate: 0.45 }]
      })

      const config: ReportGenerationConfig = {
        templateId: 'percentage-format',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })

    it('should format date type', async () => {
      const template: ReportTemplate = {
        templateId: 'date-format',
        name: 'Date Format',
        description: 'Test date formatting',
        type: 'custom',
        fields: [{ fieldId: 'date', name: 'date', label: 'Date', type: 'date' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('date-format', async () => {
        return [{ date: new Date('2026-01-15') }, { date: new Date('2026-12-25') }]
      })

      const config: ReportGenerationConfig = {
        templateId: 'date-format',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })

    it('should handle null and undefined values', async () => {
      const template: ReportTemplate = {
        templateId: 'null-test',
        name: 'Null Test',
        description: 'Test null values',
        type: 'custom',
        fields: [
          { fieldId: 'name', name: 'name', label: 'Name', type: 'string' },
          { fieldId: 'optional', name: 'optional', label: 'Optional', type: 'number' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('null-test', async () => {
        return [
          { name: 'Item 1', optional: 100 },
          { name: 'Item 2', optional: null },
          { name: 'Item 3', optional: undefined },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'null-test',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
      expect(result.totalRecords).toBe(3)
    })
  })

  describe('Stream Report Generation', () => {
    it('should generate large report using stream', async () => {
      const template: ReportTemplate = {
        templateId: 'stream-test',
        name: 'Stream Test',
        description: 'Test streaming generation',
        type: 'custom',
        fields: [
          { fieldId: 'id', name: 'id', label: 'ID', type: 'string' },
          { fieldId: 'value', name: 'value', label: 'Value', type: 'number' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('stream-test', async () => {
        const data = []
        for (let i = 0; i < 100; i++) {
          data.push({ id: `item-${i}`, value: Math.random() * 1000 })
        }
        return data
      })

      const config: ReportGenerationConfig = {
        templateId: 'stream-test',
        format: 'csv',
        batchSize: 20,
      }

      let totalChunks = 0
      for await (const _chunk of engine.generateReportStream(config)) {
        totalChunks++
      }

      expect(totalChunks).toBeGreaterThan(0)
    })

    it('should support custom batch size in streaming', async () => {
      const template: ReportTemplate = {
        templateId: 'batch-size-test',
        name: 'Batch Size Test',
        description: 'Test batch size',
        type: 'custom',
        fields: [{ fieldId: 'data', name: 'data', label: 'Data', type: 'string' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('batch-size-test', async () => {
        return Array.from({ length: 50 }, (_, i) => ({ data: `record-${i}` }))
      })

      const config: ReportGenerationConfig = {
        templateId: 'batch-size-test',
        format: 'json',
        batchSize: 10,
      }

      let chunks = 0
      for await (const _chunk of engine.generateReportStream(config)) {
        chunks++
      }

      expect(chunks).toBeGreaterThan(0)
    })

    it('should support header inclusion option', async () => {
      const template: ReportTemplate = {
        templateId: 'header-test',
        name: 'Header Test',
        description: 'Test header inclusion',
        type: 'custom',
        fields: [{ fieldId: 'col', name: 'col', label: 'Column', type: 'string' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('header-test', async () => {
        return [{ col: 'value' }]
      })

      const configWithHeader: ReportGenerationConfig = {
        templateId: 'header-test',
        format: 'csv',
        includeHeader: true,
      }

      const configWithoutHeader: ReportGenerationConfig = {
        templateId: 'header-test',
        format: 'csv',
        includeHeader: false,
      }

      let withHeaderContent = ''
      for await (const chunk of engine.generateReportStream(configWithHeader)) {
        withHeaderContent += chunk
      }

      let withoutHeaderContent = ''
      for await (const chunk of engine.generateReportStream(configWithoutHeader)) {
        withoutHeaderContent += chunk
      }

      expect(withHeaderContent).toContain('Column')
      expect(withoutHeaderContent).not.toContain('Column')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing template', async () => {
      const config: ReportGenerationConfig = {
        templateId: 'non-existent',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('模板不存在')
    })

    it('should handle missing data provider', async () => {
      const template: ReportTemplate = {
        templateId: 'no-provider',
        name: 'No Provider',
        description: 'Template without provider',
        type: 'custom',
        fields: [{ fieldId: 'f', name: 'f', label: 'Field', type: 'string' }],
      }

      engine.registerTemplate(template)

      const config: ReportGenerationConfig = {
        templateId: 'no-provider',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(false)
      expect(result.error).toContain('數據提供器未註冊')
    })

    it('should handle provider errors gracefully', async () => {
      const template: ReportTemplate = {
        templateId: 'error-provider',
        name: 'Error Provider',
        description: 'Provider that throws',
        type: 'custom',
        fields: [{ fieldId: 'f', name: 'f', label: 'Field', type: 'string' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('error-provider', async () => {
        throw new Error('Database connection failed')
      })

      const config: ReportGenerationConfig = {
        templateId: 'error-provider',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })
  })

  describe('Report Status and Metadata', () => {
    it('should include report file information', async () => {
      const template: ReportTemplate = {
        templateId: 'metadata-test',
        name: 'Metadata Test Report',
        description: 'Test metadata',
        type: 'custom',
        fields: [{ fieldId: 'id', name: 'id', label: 'ID', type: 'string' }],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('metadata-test', async () => {
        return [{ id: '1' }, { id: '2' }]
      })

      const config: ReportGenerationConfig = {
        templateId: 'metadata-test',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.reportId).toBeDefined()
      expect(result.reportId).toContain('report-')
      expect(result.fileName).toBeDefined()
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should generate status report', () => {
      const template1: ReportTemplate = {
        templateId: 'template-1',
        name: 'Template 1',
        description: 'First',
        type: 'sales',
        fields: [{ fieldId: 'f1', name: 'f1', label: 'Field 1', type: 'string' }],
      }

      const template2: ReportTemplate = {
        templateId: 'template-2',
        name: 'Template 2',
        description: 'Second',
        type: 'inventory',
        fields: [{ fieldId: 'f2', name: 'f2', label: 'Field 2', type: 'number' }],
      }

      engine.registerTemplate(template1)
      engine.registerTemplate(template2)

      engine.registerDataProvider('template-1', async () => [])
      engine.registerDataProvider('template-2', async () => [])

      const report = engine.generateStatusReport()
      expect(report).toContain('REPORT ENGINE STATUS')
      expect(report).toContain('總模板數: 2')
    })
  })

  describe('Multiple Report Types', () => {
    it('should support daily report type', async () => {
      const dailyTemplate: ReportTemplate = {
        templateId: 'daily-sales',
        name: 'Daily Sales Report',
        description: 'Daily sales summary',
        type: 'daily',
        fields: [
          { fieldId: 'date', name: 'date', label: 'Date', type: 'date' },
          { fieldId: 'sales', name: 'sales', label: 'Sales', type: 'currency' },
        ],
      }

      engine.registerTemplate(dailyTemplate)
      engine.registerDataProvider('daily-sales', async () => {
        return [
          { date: new Date('2026-01-01'), sales: 5000 },
          { date: new Date('2026-01-02'), sales: 6000 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'daily-sales',
        format: 'csv',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })

    it('should support weekly report type', async () => {
      const weeklyTemplate: ReportTemplate = {
        templateId: 'weekly-inventory',
        name: 'Weekly Inventory',
        description: 'Weekly inventory status',
        type: 'weekly',
        fields: [
          { fieldId: 'week', name: 'week', label: 'Week', type: 'string' },
          { fieldId: 'items', name: 'items', label: 'Items', type: 'number' },
        ],
      }

      engine.registerTemplate(weeklyTemplate)
      engine.registerDataProvider('weekly-inventory', async () => {
        return [
          { week: 'W01', items: 5000 },
          { week: 'W02', items: 5500 },
        ]
      })

      const config: ReportGenerationConfig = {
        templateId: 'weekly-inventory',
        format: 'json',
      }

      const result = await engine.generateReport(config)
      expect(result.success).toBe(true)
    })
  })

  describe('Performance and Large Data Sets', () => {
    it('should handle reasonably large data set', async () => {
      const template: ReportTemplate = {
        templateId: 'large-data',
        name: 'Large Data Report',
        description: 'Test with large dataset',
        type: 'custom',
        fields: [
          { fieldId: 'id', name: 'id', label: 'ID', type: 'string' },
          { fieldId: 'value', name: 'value', label: 'Value', type: 'number' },
        ],
      }

      engine.registerTemplate(template)
      engine.registerDataProvider('large-data', async () => {
        const data = []
        for (let i = 0; i < 1000; i++) {
          data.push({ id: `item-${i}`, value: Math.random() * 10000 })
        }
        return data
      })

      const config: ReportGenerationConfig = {
        templateId: 'large-data',
        format: 'csv',
      }

      const startTime = Date.now()
      const result = await engine.generateReport(config)
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.totalRecords).toBe(1000)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})
