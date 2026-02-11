/**
 * Report Generation Engine
 * 報表生成引擎系統
 *
 * 職責：
 * 1. 報表模板管理
 * 2. 數據提取和轉換
 * 3. 流式報表生成
 * 4. 格式化輸出（CSV、Excel）
 * 5. 大數據量支持（百萬行）
 */

export interface ReportTemplate {
  templateId: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'sales' | 'inventory' | 'custom'
  fields: ReportField[]
  filters?: ReportFilter[]
  pageSize?: number // 流式生成的頁大小
}

export interface ReportField {
  fieldId: string
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage'
  width?: number // CSV/Excel 列寬
  format?: string // 格式化字符串
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface ReportFilter {
  field: string
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between'
  value: unknown
}

export interface ReportGenerationConfig {
  templateId: string
  filters?: ReportFilter[]
  format: 'csv' | 'excel' | 'json'
  batchSize?: number // 流式生成的批大小
  includeHeader?: boolean
  encoding?: string // csv 編碼
}

export interface ReportGenerationResult {
  reportId: string
  templateId: string
  format: string
  totalRecords: number
  processingTime: number
  fileName: string
  fileSize: number
  success: boolean
  error?: string
}

export interface ReportDataRow {
  [key: string]: unknown
}

/**
 * 報表生成引擎
 */
export class ReportGenerationEngine {
  private templates: Map<string, ReportTemplate> = new Map()
  private dataProviders: Map<string, (filters?: ReportFilter[]) => Promise<ReportDataRow[]>> =
    new Map()

  constructor() {
    console.log('[ReportGenerationEngine] 報表生成引擎初始化')
  }

  /**
   * 註冊報表模板
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.templateId, template)
    console.log(`[ReportGenerationEngine] 已註冊模板: ${template.templateId}`)
    console.log(`  名稱: ${template.name}`)
    console.log(`  類型: ${template.type}`)
    console.log(`  欄位數: ${template.fields.length}`)
  }

  /**
   * 註冊數據提供器
   */
  registerDataProvider(
    templateId: string,
    provider: (filters?: ReportFilter[]) => Promise<ReportDataRow[]>
  ): void {
    this.dataProviders.set(templateId, provider)
    console.log(`[ReportGenerationEngine] 已註冊數據提供器: ${templateId}`)
  }

  /**
   * 生成報表
   */
  async generateReport(config: ReportGenerationConfig): Promise<ReportGenerationResult> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    console.log(`[ReportGenerationEngine] 開始生成報表: ${reportId}`)
    console.log(`  模板: ${config.templateId}`)
    console.log(`  格式: ${config.format}`)

    try {
      const template = this.templates.get(config.templateId)
      if (!template) {
        throw new Error(`模板不存在: ${config.templateId}`)
      }

      const provider = this.dataProviders.get(config.templateId)
      if (!provider) {
        throw new Error(`數據提供器未註冊: ${config.templateId}`)
      }

      // 獲取數據（帶篩選）
      const data = await provider(config.filters)
      console.log(`[ReportGenerationEngine] 已獲取 ${data.length} 條數據`)

      // 格式化數據
      const formattedData = this.formatData(data, template)

      // 生成報表內容
      let reportContent = ''
      let fileSize = 0

      switch (config.format) {
        case 'csv':
          reportContent = this.generateCSV(formattedData, template)
          break
        case 'excel':
          reportContent = this.generateExcelJSON(formattedData, template)
          break
        case 'json':
          reportContent = JSON.stringify(formattedData, null, 2)
          break
      }

      fileSize = reportContent.length

      const processingTime = Date.now() - startTime

      const result: ReportGenerationResult = {
        reportId,
        templateId: config.templateId,
        format: config.format,
        totalRecords: data.length,
        processingTime,
        fileName: `${template.name}_${reportId}.${config.format === 'excel' ? 'xlsx' : config.format}`,
        fileSize,
        success: true,
      }

      console.log(`[ReportGenerationEngine] 報表生成完成: ${reportId}`)
      console.log(`  記錄數: ${result.totalRecords}`)
      console.log(`  文件大小: ${(fileSize / 1024).toFixed(2)}KB`)
      console.log(`  耗時: ${processingTime}ms`)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[ReportGenerationEngine] 報表生成失敗: ${reportId} - ${errorMessage}`)

      return {
        reportId,
        templateId: config.templateId,
        format: config.format,
        totalRecords: 0,
        processingTime: Date.now() - startTime,
        fileName: `${config.templateId}_${reportId}_error.txt`,
        fileSize: 0,
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 流式生成報表（支持大數據量）
   */
  async *generateReportStream(
    config: ReportGenerationConfig
  ): AsyncGenerator<string, ReportGenerationResult, undefined> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    let totalRecords = 0

    try {
      const template = this.templates.get(config.templateId)
      if (!template) {
        throw new Error(`模板不存在: ${config.templateId}`)
      }

      const provider = this.dataProviders.get(config.templateId)
      if (!provider) {
        throw new Error(`數據提供器未註冊: ${config.templateId}`)
      }

      // 獲取數據
      const data = await provider(config.filters)
      totalRecords = data.length

      // 格式化數據
      const formattedData = this.formatData(data, template)

      // 流式輸出報表
      const batchSize = config.batchSize ?? 1000

      if (config.format === 'csv') {
        // 輸出 CSV 標題
        if (config.includeHeader !== false) {
          const header = template.fields.map((f) => f.label).join(',')
          yield `${header}\n`
        }

        // 分批輸出數據行
        for (let i = 0; i < formattedData.length; i += batchSize) {
          const batch = formattedData.slice(i, i + batchSize)
          const csvLines = batch.map((row) =>
            template.fields.map((field) => this.escapeCSV(row[field.fieldId] ?? '')).join(',')
          )
          yield `${csvLines.join('\n')}\n`
        }
      } else if (config.format === 'json') {
        // 流式 JSON 數組
        yield '[\n'
        for (let i = 0; i < formattedData.length; i++) {
          const row = formattedData[i]
          yield JSON.stringify(row)
          if (i < formattedData.length - 1) {
            yield ',\n'
          } else {
            yield '\n'
          }
        }
        yield ']\n'
      }

      const processingTime = Date.now() - startTime

      return {
        reportId,
        templateId: config.templateId,
        format: config.format,
        totalRecords,
        processingTime,
        fileName: `${template.name}_${reportId}.${config.format}`,
        fileSize: 0, // 流式生成時未知
        success: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        reportId,
        templateId: config.templateId,
        format: config.format,
        totalRecords,
        processingTime: Date.now() - startTime,
        fileName: `${config.templateId}_${reportId}_error.txt`,
        fileSize: 0,
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 格式化數據
   */
  private formatData(data: ReportDataRow[], template: ReportTemplate): ReportDataRow[] {
    return data.map((row) => {
      const formatted: ReportDataRow = {}

      for (const field of template.fields) {
        let value = row[field.fieldId]

        // 應用格式化
        if (value !== null && value !== undefined) {
          switch (field.type) {
            case 'number':
              value = Number(value)
              break
            case 'currency':
              value = Number(value).toFixed(2)
              break
            case 'percentage':
              value = `${(Number(value) * 100).toFixed(2)}%`
              break
            case 'date':
              if (value instanceof Date) {
                value = value.toISOString().split('T')[0]
              }
              break
          }
        }

        formatted[field.fieldId] = value
      }

      return formatted
    })
  }

  /**
   * 生成 CSV 格式
   */
  private generateCSV(data: ReportDataRow[], template: ReportTemplate): string {
    const lines: string[] = []

    // 添加標題
    const header = template.fields.map((f) => f.label).join(',')
    lines.push(header)

    // 添加數據
    for (const row of data) {
      const csvRow = template.fields.map((field) => this.escapeCSV(row[field.fieldId] ?? ''))
      lines.push(csvRow.join(','))
    }

    return lines.join('\n')
  }

  /**
   * 生成 Excel 格式（簡化為 JSON）
   */
  private generateExcelJSON(data: ReportDataRow[], template: ReportTemplate): string {
    const excelData = {
      sheets: [
        {
          name: 'Report',
          data: [
            template.fields.map((f) => f.label),
            ...data.map((row) => template.fields.map((field) => row[field.fieldId] ?? '')),
          ],
        },
      ],
    }
    return JSON.stringify(excelData, null, 2)
  }

  /**
   * 轉義 CSV 值
   */
  private escapeCSV(value: unknown): string {
    const str = String(value ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  /**
   * 獲取所有模板
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 獲取模板
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * 獲取模板字段
   */
  getTemplateFields(templateId: string): ReportField[] {
    return this.templates.get(templateId)?.fields ?? []
  }

  /**
   * 生成引擎狀態報告
   */
  generateStatusReport(): string {
    const lines: string[] = []
    lines.push('========== REPORT ENGINE STATUS ==========')
    lines.push('')

    lines.push('--- REGISTERED TEMPLATES ---')
    lines.push(`總模板數: ${this.templates.size}`)

    for (const [id, template] of this.templates) {
      lines.push(`  ${id}`)
      lines.push(`    名稱: ${template.name}`)
      lines.push(`    類型: ${template.type}`)
      lines.push(`    欄位數: ${template.fields.length}`)
    }

    lines.push('')
    lines.push('--- DATA PROVIDERS ---')
    lines.push(`已註冊提供器: ${this.dataProviders.size}`)

    return lines.join('\n')
  }
}
