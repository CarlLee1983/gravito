/**
 * Report Storage Manager
 * 報表存儲管理系統
 *
 * 職責：
 * 1. 報表持久化存儲
 * 2. 報表檢索和查詢
 * 3. 報表版本控制
 * 4. 過期報表清理
 */

export interface StoredReport {
  reportId: string
  templateId: string
  name: string
  description: string
  format: 'csv' | 'excel' | 'json'
  content: string
  fileSize: number
  totalRecords: number
  createdAt: Date
  expiresAt?: Date
  tags: string[]
  metadata: Record<string, unknown>
  storagePath: string
  checksum: string
}

export interface StorageConfig {
  maxReportAge?: number // 默認 90 天
  maxStorageSize?: number // 默認 10GB
  cleanupInterval?: number // 默認每天 1 次
  enableVersioning?: boolean // 默認 true
  compressionEnabled?: boolean // 默認 false
}

export interface ReportQuery {
  templateId?: string
  startDate?: Date
  endDate?: Date
  tags?: string[]
  format?: 'csv' | 'excel' | 'json'
  limit?: number
  offset?: number
}

export interface StorageStats {
  totalReports: number
  totalSize: number
  oldestReport?: Date
  newestReport?: Date
  averageReportSize: number
  reportsByFormat: Record<string, number>
  reportsByTemplate: Record<string, number>
}

/**
 * 報表存儲管理器
 */
export class ReportStorageManager {
  private config: Required<StorageConfig>
  private reports: Map<string, StoredReport> = new Map()
  private reportVersions: Map<string, StoredReport[]> = new Map()
  private totalSize = 0

  constructor(config: StorageConfig = {}) {
    this.config = {
      maxReportAge: config.maxReportAge ?? 90 * 24 * 60 * 60 * 1000, // 90 days
      maxStorageSize: config.maxStorageSize ?? 10 * 1024 * 1024 * 1024, // 10GB
      cleanupInterval: config.cleanupInterval ?? 24 * 60 * 60 * 1000, // 1 day
      enableVersioning: config.enableVersioning ?? true,
      compressionEnabled: config.compressionEnabled ?? false,
    }

    console.log('[ReportStorageManager] 報表存儲管理器初始化')
    console.log(`  最大報表年齡: ${(this.config.maxReportAge / 1000 / 60 / 60 / 24).toFixed(0)} 天`)
    console.log(`  最大存儲容量: ${(this.config.maxStorageSize / 1024 / 1024 / 1024).toFixed(2)}GB`)

    // 啟動自動清理
    this.startAutoCleanup()
  }

  /**
   * 存儲報表
   */
  storeReport(
    reportId: string,
    templateId: string,
    name: string,
    description: string,
    format: 'csv' | 'excel' | 'json',
    content: string,
    totalRecords: number,
    tags: string[] = [],
    metadata: Record<string, unknown> = {}
  ): StoredReport {
    const fileSize = new TextEncoder().encode(content).length
    const checksum = this.calculateChecksum(content)

    const storedReport: StoredReport = {
      reportId,
      templateId,
      name,
      description,
      format,
      content,
      fileSize,
      totalRecords,
      createdAt: new Date(),
      tags,
      metadata,
      storagePath: `reports/${templateId}/${reportId}.${format}`,
      checksum,
    }

    // 版本控制
    if (this.config.enableVersioning) {
      const versions = this.reportVersions.get(reportId) || []
      versions.push(storedReport)
      this.reportVersions.set(reportId, versions)
    }

    // 存儲報表
    this.reports.set(reportId, storedReport)
    this.totalSize += fileSize

    console.log(`[ReportStorageManager] 報表已存儲: ${reportId}`)
    console.log(`  模板: ${templateId}`)
    console.log(`  格式: ${format}`)
    console.log(`  大小: ${(fileSize / 1024).toFixed(2)}KB`)
    console.log(`  記錄數: ${totalRecords}`)

    // 檢查存儲容量
    if (this.totalSize > this.config.maxStorageSize) {
      this.evictOldestReports()
    }

    return storedReport
  }

  /**
   * 檢索報表
   */
  retrieveReport(reportId: string): StoredReport | undefined {
    return this.reports.get(reportId)
  }

  /**
   * 查詢報表
   */
  queryReports(query: ReportQuery): StoredReport[] {
    let results = Array.from(this.reports.values())

    if (query.templateId) {
      results = results.filter((r) => r.templateId === query.templateId)
    }

    if (query.startDate) {
      const startDate = query.startDate
      results = results.filter((r) => r.createdAt >= startDate)
    }

    if (query.endDate) {
      const endDate = query.endDate
      results = results.filter((r) => r.createdAt <= endDate)
    }

    if (query.format) {
      results = results.filter((r) => r.format === query.format)
    }

    if (query.tags?.length) {
      results = results.filter((r) => query.tags?.some((tag) => r.tags.includes(tag)))
    }

    // 排序（最新優先）
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // 分頁
    const offset = query.offset || 0
    const limit = query.limit || 100

    return results.slice(offset, offset + limit)
  }

  /**
   * 刪除報表
   */
  deleteReport(reportId: string): boolean {
    const report = this.reports.get(reportId)
    if (!report) {
      return false
    }

    this.reports.delete(reportId)
    this.totalSize -= report.fileSize

    if (this.config.enableVersioning) {
      this.reportVersions.delete(reportId)
    }

    console.log(`[ReportStorageManager] 報表已刪除: ${reportId}`)
    return true
  }

  /**
   * 獲取報表版本
   */
  getReportVersions(reportId: string): StoredReport[] {
    return this.reportVersions.get(reportId) || []
  }

  /**
   * 設置報表過期時間
   */
  setReportExpiration(reportId: string, expiresAt: Date): boolean {
    const report = this.reports.get(reportId)
    if (!report) {
      return false
    }

    report.expiresAt = expiresAt
    console.log(
      `[ReportStorageManager] 報表過期時間已設置: ${reportId} -> ${expiresAt.toISOString()}`
    )
    return true
  }

  /**
   * 更新報表元數據
   */
  updateReportMetadata(reportId: string, metadata: Record<string, unknown>): boolean {
    const report = this.reports.get(reportId)
    if (!report) {
      return false
    }

    report.metadata = { ...report.metadata, ...metadata }
    console.log(`[ReportStorageManager] 報表元數據已更新: ${reportId}`)
    return true
  }

  /**
   * 添加報表標籤
   */
  addReportTag(reportId: string, tag: string): boolean {
    const report = this.reports.get(reportId)
    if (!report) {
      return false
    }

    if (!report.tags.includes(tag)) {
      report.tags.push(tag)
      console.log(`[ReportStorageManager] 標籤已添加: ${reportId} -> ${tag}`)
    }

    return true
  }

  /**
   * 移除報表標籤
   */
  removeReportTag(reportId: string, tag: string): boolean {
    const report = this.reports.get(reportId)
    if (!report) {
      return false
    }

    const index = report.tags.indexOf(tag)
    if (index > -1) {
      report.tags.splice(index, 1)
      console.log(`[ReportStorageManager] 標籤已移除: ${reportId} -> ${tag}`)
    }

    return true
  }

  /**
   * 獲取存儲統計
   */
  getStats(): StorageStats {
    const reports = Array.from(this.reports.values())
    const reportsByFormat: Record<string, number> = {}
    const reportsByTemplate: Record<string, number> = {}

    for (const report of reports) {
      reportsByFormat[report.format] = (reportsByFormat[report.format] || 0) + 1
      reportsByTemplate[report.templateId] = (reportsByTemplate[report.templateId] || 0) + 1
    }

    const dates = reports.map((r) => r.createdAt.getTime()).sort()

    return {
      totalReports: reports.length,
      totalSize: this.totalSize,
      oldestReport: reports.length > 0 ? new Date(dates[0]) : undefined,
      newestReport: reports.length > 0 ? new Date(dates[dates.length - 1]) : undefined,
      averageReportSize: reports.length > 0 ? this.totalSize / reports.length : 0,
      reportsByFormat,
      reportsByTemplate,
    }
  }

  /**
   * 計算內容校驗和
   */
  private calculateChecksum(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 清理過期報表
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [reportId, report] of this.reports) {
      // 檢查過期時間
      if (report.expiresAt && report.expiresAt.getTime() < now) {
        toDelete.push(reportId)
        continue
      }

      // 檢查報表年齡
      if (now - report.createdAt.getTime() > this.config.maxReportAge) {
        toDelete.push(reportId)
      }
    }

    for (const reportId of toDelete) {
      this.deleteReport(reportId)
    }

    if (toDelete.length > 0) {
      console.log(`[ReportStorageManager] 已清理 ${toDelete.length} 個過期報表`)
    }
  }

  /**
   * 驅逐最舊的報表以釋放空間
   */
  private evictOldestReports(): void {
    const reports = Array.from(this.reports.values())
    reports.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    let releasedSize = 0
    const targetSize = this.config.maxStorageSize * 0.8 // 恢復到 80%

    for (const report of reports) {
      if (this.totalSize <= targetSize) {
        break
      }

      this.deleteReport(report.reportId)
      releasedSize += report.fileSize
    }

    console.log(
      `[ReportStorageManager] 驅逐報表以釋放空間: ${(releasedSize / 1024 / 1024).toFixed(2)}MB`
    )
  }

  /**
   * 啟動自動清理
   */
  private startAutoCleanup(): void {
    setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 生成狀態報告
   */
  generateStatusReport(): string {
    const stats = this.getStats()

    const lines: string[] = []
    lines.push('========== REPORT STORAGE STATUS ==========')
    lines.push('')

    lines.push('--- STORAGE STATISTICS ---')
    lines.push(`總報表數: ${stats.totalReports}`)
    lines.push(`總存儲大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
    lines.push(`平均報表大小: ${(stats.averageReportSize / 1024).toFixed(2)}KB`)

    if (stats.oldestReport) {
      lines.push(`最舊報表: ${stats.oldestReport.toISOString()}`)
    }

    if (stats.newestReport) {
      lines.push(`最新報表: ${stats.newestReport.toISOString()}`)
    }

    lines.push('')
    lines.push('--- REPORTS BY FORMAT ---')
    for (const [format, count] of Object.entries(stats.reportsByFormat)) {
      lines.push(`  ${format}: ${count}`)
    }

    lines.push('')
    lines.push('--- REPORTS BY TEMPLATE ---')
    for (const [template, count] of Object.entries(stats.reportsByTemplate)) {
      lines.push(`  ${template}: ${count}`)
    }

    lines.push('')
    lines.push('--- CONFIGURATION ---')
    lines.push(`最大報表年齡: ${(this.config.maxReportAge / 1000 / 60 / 60 / 24).toFixed(0)} 天`)
    lines.push(`最大存儲容量: ${(this.config.maxStorageSize / 1024 / 1024 / 1024).toFixed(2)}GB`)
    lines.push(`清理間隔: ${(this.config.cleanupInterval / 1000 / 60).toFixed(0)} 分鐘`)
    lines.push(`版本控制: ${this.config.enableVersioning ? '啟用' : '禁用'}`)

    return lines.join('\n')
  }
}
