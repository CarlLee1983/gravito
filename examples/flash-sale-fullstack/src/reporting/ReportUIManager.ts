/**
 * Report UI Manager
 * 報表 UI 管理系統
 *
 * 職責：
 * 1. 報表列表查看
 * 2. 報表詳情展示
 * 3. 報表搜索和篩選
 * 4. 報表下載和分享
 * 5. 調度管理界面
 */

export interface UIState {
  currentPage: 'list' | 'details' | 'schedule' | 'download'
  selectedReportId?: string
  filters: UIReportFilter
  searchQuery: string
  sortBy: 'date' | 'name' | 'size'
  sortOrder: 'asc' | 'desc'
  itemsPerPage: number
  currentPageNumber: number
}

export interface UIReportFilter {
  templateId?: string
  format?: 'csv' | 'excel' | 'json'
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}

export interface UIAction {
  type:
    | 'SET_PAGE'
    | 'SELECT_REPORT'
    | 'UPDATE_FILTERS'
    | 'SEARCH'
    | 'SORT'
    | 'DELETE_REPORT'
    | 'DOWNLOAD_REPORT'
    | 'SHARE_REPORT'
    | 'REFRESH'
  payload?: unknown
}

export interface ReportListItem {
  reportId: string
  name: string
  templateId: string
  format: string
  fileSize: number
  createdAt: Date
  tags: string[]
  recordCount: number
}

export interface ReportDetails {
  reportId: string
  name: string
  description: string
  templateId: string
  format: string
  fileSize: number
  totalRecords: number
  createdAt: Date
  tags: string[]
  metadata: Record<string, unknown>
  previewData?: unknown[] // 前 10 行數據預覽
}

export interface DownloadOptions {
  format: 'csv' | 'excel' | 'json'
  includeMetadata: boolean
  compressionEnabled: boolean
  fileName: string
}

export interface ShareOptions {
  method: 'email' | 'link' | 'webhook'
  destination: string
  expireAt?: Date
  includeMetadata: boolean
}

/**
 * 報表 UI 管理器
 */
export class ReportUIManager {
  private state: UIState = {
    currentPage: 'list',
    filters: {},
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
    itemsPerPage: 20,
    currentPageNumber: 1,
  }

  private reportCache: Map<string, ReportDetails> = new Map()
  private listCache: ReportListItem[] = []
  private listeners: Map<string, ((state: UIState) => void)[]> = new Map()

  constructor() {
    console.log('[ReportUIManager] 報表 UI 管理器初始化')
  }

  /**
   * 獲取當前 UI 狀態
   */
  getState(): UIState {
    return { ...this.state }
  }

  /**
   * 執行 UI 操作
   */
  dispatch(action: UIAction): void {
    console.log(`[ReportUIManager] 執行操作: ${action.type}`)

    switch (action.type) {
      case 'SET_PAGE': {
        const page = action.payload as 'list' | 'details' | 'schedule' | 'download'
        this.state.currentPage = page
        this.state.currentPageNumber = 1
        break
      }

      case 'SELECT_REPORT': {
        this.state.selectedReportId = action.payload as string
        this.state.currentPage = 'details'
        break
      }

      case 'UPDATE_FILTERS': {
        this.state.filters = { ...this.state.filters, ...(action.payload as UIReportFilter) }
        this.state.currentPageNumber = 1
        break
      }

      case 'SEARCH': {
        this.state.searchQuery = action.payload as string
        this.state.currentPageNumber = 1
        break
      }

      case 'SORT': {
        const { sortBy, sortOrder } = action.payload as {
          sortBy: 'date' | 'name' | 'size'
          sortOrder: 'asc' | 'desc'
        }
        this.state.sortBy = sortBy
        this.state.sortOrder = sortOrder
        break
      }

      case 'DELETE_REPORT': {
        const reportId = action.payload as string
        this.reportCache.delete(reportId)
        break
      }

      case 'DOWNLOAD_REPORT': {
        const reportId = action.payload as string
        this.handleDownload(reportId)
        break
      }

      case 'SHARE_REPORT': {
        const { reportId, options } = action.payload as {
          reportId: string
          options: ShareOptions
        }
        this.handleShare(reportId, options)
        break
      }

      case 'REFRESH': {
        this.reportCache.clear()
        this.listCache = []
        break
      }
    }

    this.notifyListeners()
  }

  /**
   * 獲取報表列表
   */
  async getReportList(): Promise<ReportListItem[]> {
    // 模擬從後端獲取報表列表
    console.log('[ReportUIManager] 獲取報表列表')

    // 應用搜索和篩選
    let results = this.listCache

    if (this.state.searchQuery) {
      results = results.filter(
        (r) =>
          r.name.includes(this.state.searchQuery) || r.reportId.includes(this.state.searchQuery)
      )
    }

    if (this.state.filters.templateId) {
      results = results.filter((r) => r.templateId === this.state.filters.templateId)
    }

    if (this.state.filters.format) {
      results = results.filter((r) => r.format === this.state.filters.format)
    }

    if (this.state.filters.tags?.length) {
      results = results.filter(
        (r) => this.state.filters.tags?.some((tag) => r.tags.includes(tag)) ?? false
      )
    }

    // 排序
    results.sort((a, b) => {
      let comparison = 0

      switch (this.state.sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.fileSize - b.fileSize
          break
      }

      return this.state.sortOrder === 'asc' ? comparison : -comparison
    })

    return results
  }

  /**
   * 獲取報表詳情
   */
  async getReportDetails(reportId: string): Promise<ReportDetails | null> {
    // 從緩存取得
    if (this.reportCache.has(reportId)) {
      return this.reportCache.get(reportId) || null
    }

    // 模擬從後端獲取
    console.log(`[ReportUIManager] 獲取報表詳情: ${reportId}`)

    const details: ReportDetails = {
      reportId,
      name: `Report ${reportId}`,
      description: 'Sample report description',
      templateId: 'sample',
      format: 'csv',
      fileSize: 1024 * 100,
      totalRecords: 1000,
      createdAt: new Date(),
      tags: ['sample'],
      metadata: {},
      previewData: [],
    }

    this.reportCache.set(reportId, details)
    return details
  }

  /**
   * 搜索報表
   */
  async searchReports(query: string): Promise<ReportListItem[]> {
    this.state.searchQuery = query
    return this.getReportList()
  }

  /**
   * 過濾報表
   */
  async filterReports(filters: UIReportFilter): Promise<ReportListItem[]> {
    this.state.filters = { ...this.state.filters, ...filters }
    return this.getReportList()
  }

  /**
   * 排序報表
   */
  async sortReports(sortBy: 'date' | 'name' | 'size', order: 'asc' | 'desc'): Promise<void> {
    this.state.sortBy = sortBy
    this.state.sortOrder = order
    this.notifyListeners()
  }

  /**
   * 獲取分頁報表
   */
  async getPaginatedReports(pageNumber: number): Promise<{
    items: ReportListItem[]
    total: number
    pageNumber: number
    pageSize: number
    totalPages: number
  }> {
    const allReports = await this.getReportList()
    const total = allReports.length
    const pageSize = this.state.itemsPerPage
    const totalPages = Math.ceil(total / pageSize)

    const start = (pageNumber - 1) * pageSize
    const end = start + pageSize
    const items = allReports.slice(start, end)

    this.state.currentPageNumber = pageNumber

    return {
      items,
      total,
      pageNumber,
      pageSize,
      totalPages,
    }
  }

  /**
   * 處理報表下載
   */
  private handleDownload(reportId: string): void {
    console.log(`[ReportUIManager] 下載報表: ${reportId}`)

    // 模擬下載流程
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const downloadUrl = `${origin}/api/reports/${reportId}/download`
    console.log(`  下載 URL: ${downloadUrl}`)

    // 在實際應用中，會調用真實的下載 API
  }

  /**
   * 處理報表分享
   */
  private handleShare(reportId: string, options: ShareOptions): void {
    console.log(`[ReportUIManager] 分享報表: ${reportId}`)
    console.log(`  方法: ${options.method}`)
    console.log(`  目標: ${options.destination}`)

    // 模擬分享流程
    switch (options.method) {
      case 'email':
        console.log(`  發送郵件到: ${options.destination}`)
        break
      case 'link': {
        const origin =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        const shareLink = `${origin}/reports/${reportId}?share-key=...`
        console.log(`  分享鏈接: ${shareLink}`)
        break
      }
      case 'webhook':
        console.log(`  發送到 Webhook: ${options.destination}`)
        break
    }
  }

  /**
   * 刪除報表
   */
  async deleteReport(reportId: string): Promise<boolean> {
    console.log(`[ReportUIManager] 刪除報表: ${reportId}`)
    this.reportCache.delete(reportId)
    this.listCache = this.listCache.filter((r) => r.reportId !== reportId)
    this.notifyListeners()
    return true
  }

  /**
   * 設置每頁項目數
   */
  setItemsPerPage(count: number): void {
    this.state.itemsPerPage = count
    this.state.currentPageNumber = 1
    this.notifyListeners()
  }

  /**
   * 監聽狀態變化
   */
  subscribe(listener: (state: UIState) => void): () => void {
    const listeners = this.listeners.get('state') || []
    listeners.push(listener)
    this.listeners.set('state', listeners)

    // 返回取消訂閱函數
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx > -1) {
        listeners.splice(idx, 1)
      }
    }
  }

  /**
   * 通知監聽器
   */
  private notifyListeners(): void {
    const listeners = this.listeners.get('state') || []
    for (const listener of listeners) {
      listener(this.getState())
    }
  }

  /**
   * 生成 UI 報告
   */
  generateUIReport(): string {
    const lines: string[] = []
    lines.push('========== REPORT UI STATUS ==========')
    lines.push('')

    lines.push('--- CURRENT STATE ---')
    lines.push(`當前頁面: ${this.state.currentPage}`)
    lines.push(`選中報表: ${this.state.selectedReportId || '無'}`)
    lines.push(`搜索查詢: ${this.state.searchQuery || '無'}`)
    lines.push(`排序方式: ${this.state.sortBy} (${this.state.sortOrder})`)
    lines.push(`當前頁碼: ${this.state.currentPageNumber}`)
    lines.push(`每頁項目: ${this.state.itemsPerPage}`)
    lines.push('')

    lines.push('--- CACHE STATUS ---')
    lines.push(`緩存報表: ${this.reportCache.size}`)
    lines.push(`列表項目: ${this.listCache.length}`)
    lines.push('')

    lines.push('--- FILTERS ---')
    if (this.state.filters.templateId) {
      lines.push(`  模板: ${this.state.filters.templateId}`)
    }
    if (this.state.filters.format) {
      lines.push(`  格式: ${this.state.filters.format}`)
    }
    if (this.state.filters.tags?.length) {
      lines.push(`  標籤: ${this.state.filters.tags.join(', ')}`)
    }

    return lines.join('\n')
  }
}
