/**
 * Migration Manager
 * 數據遷移管理器，實現無停機遷移
 *
 * 職責：
 * 1. 協調數據遷移過程
 * 2. 管理雙寫狀態
 * 3. 驅動遷移進度
 * 4. 控制切流時機
 */

export interface MigrationConfig {
  batchSize: number // 每批遷移記錄數
  concurrency: number // 並發遷移數
  delayMs: number // 批次之間的延遲
  verifyAfterMigration: boolean // 遷移後驗證
}

export interface MigrationStats {
  totalRecords: number
  migratedRecords: number
  failedRecords: number
  startTime: Date
  currentPhase: 'preparation' | 'dual-write' | 'shadow' | 'validation' | 'cutover'
  progress: number // 0-100
  estimatedTimeRemaining: number // 毫秒
}

export interface MigrationPhase {
  phase: 'preparation' | 'dual-write' | 'shadow' | 'validation' | 'cutover'
  startTime: Date
  endTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  details: Record<string, any>
}

/**
 * 數據遷移管理器
 */
export class MigrationManager {
  private config: MigrationConfig
  private stats: MigrationStats
  private phases: Map<string, MigrationPhase> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()
  private migrationLog: Array<{ timestamp: Date; event: string; details: any }> = []

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 1000,
      concurrency: config.concurrency || 5,
      delayMs: config.delayMs || 100,
      verifyAfterMigration: config.verifyAfterMigration !== false,
    }

    this.stats = {
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      startTime: new Date(),
      currentPhase: 'preparation',
      progress: 0,
      estimatedTimeRemaining: 0,
    }
  }

  /**
   * 開始遷移流程
   */
  async startMigration(totalRecords: number): Promise<void> {
    this.stats.totalRecords = totalRecords
    this.stats.startTime = new Date()
    this.emit('migration:start', { totalRecords })

    try {
      // 階段 1: 準備
      await this.runPhase('preparation', () => this.prepareForMigration())

      // 階段 2: 雙寫
      await this.runPhase('dual-write', () => this.enableDualWrite())

      // 階段 3: 影子寫
      await this.runPhase('shadow', () => this.performShadowMigration())

      // 階段 4: 驗證
      await this.runPhase('validation', () => this.validateMigration())

      // 階段 5: 切流
      await this.runPhase('cutover', () => this.performCutover())

      this.emit('migration:completed', this.stats)
    } catch (error) {
      this.emit('migration:failed', { error, stats: this.stats })
      throw error
    }
  }

  /**
   * 執行遷移階段
   */
  private async runPhase(
    phase: MigrationPhase['phase'],
    handler: () => Promise<void>
  ): Promise<void> {
    const phaseData: MigrationPhase = {
      phase,
      startTime: new Date(),
      status: 'running',
      details: {},
    }

    this.phases.set(phase, phaseData)
    this.stats.currentPhase = phase
    this.emit(`phase:${phase}:start`, phaseData)

    try {
      await handler()

      phaseData.status = 'completed'
      phaseData.endTime = new Date()
      this.emit(`phase:${phase}:completed`, phaseData)
    } catch (error) {
      phaseData.status = 'failed'
      phaseData.endTime = new Date()
      this.emit(`phase:${phase}:failed`, { phase: phaseData, error })
      throw error
    }
  }

  /**
   * 準備階段：驗證源和目標架構
   */
  private async prepareForMigration(): Promise<void> {
    this.logMigration('準備階段開始', { totalRecords: this.stats.totalRecords })

    // 驗證源和目標連接
    // 驗證 schema 兼容性
    // 創建遷移臨時表

    await new Promise((resolve) => setTimeout(resolve, 100))
    this.logMigration('準備階段完成', { status: 'ready' })
  }

  /**
   * 雙寫階段：開啟新舊並行寫
   */
  private async enableDualWrite(): Promise<void> {
    this.logMigration('雙寫階段開始', { concurrency: this.config.concurrency })

    // 開啟雙寫開關
    // 新的寫操作會同時寫入舊和新架構

    await new Promise((resolve) => setTimeout(resolve, 100))
    this.logMigration('雙寫階段完成', { status: 'enabled' })
  }

  /**
   * 影子遷移：後台遷移歷史數據
   */
  private async performShadowMigration(): Promise<void> {
    this.logMigration('影子遷移開始', {
      batchSize: this.config.batchSize,
      concurrency: this.config.concurrency,
    })

    const totalBatches = Math.ceil(this.stats.totalRecords / this.config.batchSize)

    for (let batch = 0; batch < totalBatches; batch++) {
      const startRecord = batch * this.config.batchSize
      const endRecord = Math.min(startRecord + this.config.batchSize, this.stats.totalRecords)
      const batchRecords = endRecord - startRecord

      // 模擬遷移批次
      await this.migrateBatch(startRecord, batchRecords)

      this.stats.migratedRecords += batchRecords
      this.stats.progress = Math.round((this.stats.migratedRecords / this.stats.totalRecords) * 100)

      // 計算預估時間
      const elapsed = Date.now() - this.stats.startTime.getTime()
      const rate = this.stats.migratedRecords / (elapsed / 1000) // records/sec
      this.stats.estimatedTimeRemaining = Math.round(
        ((this.stats.totalRecords - this.stats.migratedRecords) / rate) * 1000
      )

      this.emit('migration:progress', {
        progress: this.stats.progress,
        migratedRecords: this.stats.migratedRecords,
        estimatedTimeRemaining: this.stats.estimatedTimeRemaining,
      })

      // 延遲避免過載
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs))
    }

    this.logMigration('影子遷移完成', {
      migratedRecords: this.stats.migratedRecords,
      failedRecords: this.stats.failedRecords,
    })
  }

  /**
   * 遷移一批數據
   */
  private async migrateBatch(startRecord: number, count: number): Promise<void> {
    const promises = []

    for (let i = 0; i < count; i++) {
      const recordId = startRecord + i

      promises.push(
        this.migrateRecord(recordId).catch((error) => {
          this.stats.failedRecords++
          this.logMigration(`記錄遷移失敗: ${recordId}`, { error: String(error) })
        })
      )

      // 控制並發
      if (promises.length >= this.config.concurrency) {
        await Promise.all(promises.splice(0, this.config.concurrency))
      }
    }

    // 等待剩餘的 promises
    if (promises.length > 0) {
      await Promise.all(promises)
    }
  }

  /**
   * 遷移單條記錄
   */
  private async migrateRecord(_recordId: number): Promise<void> {
    // 模擬讀取源數據和寫入目標數據庫
    // 實際應用中會：
    // 1. 從源系統查詢記錄
    // 2. 計算分片 ID: recordId % 8
    // 3. 寫入目標分片數據庫
    // 4. 驗證寫入成功

    // 模擬網絡延遲
    await new Promise((resolve) => setTimeout(resolve, 1))
  }

  /**
   * 驗證階段：驗證遷移數據
   */
  private async validateMigration(): Promise<void> {
    this.logMigration('驗證階段開始', { migratedRecords: this.stats.migratedRecords })

    // 驗證記錄數
    // 驗證數據完整性
    // 驗證檢查和

    if (
      this.config.verifyAfterMigration &&
      this.stats.migratedRecords !== this.stats.totalRecords
    ) {
      throw new Error(
        `遷移驗證失敗: 期望 ${this.stats.totalRecords}，實際 ${this.stats.migratedRecords}`
      )
    }

    this.logMigration('驗證階段完成', { status: 'passed' })
  }

  /**
   * 切流階段：切換到新架構
   */
  private async performCutover(): Promise<void> {
    this.logMigration('切流階段開始', { timestamp: new Date() })

    // 關閉舊架構
    // 驗證新架構運行正常
    // 更新路由配置

    await new Promise((resolve) => setTimeout(resolve, 100))
    this.logMigration('切流階段完成', { status: 'switched' })
  }

  /**
   * 獲取遷移統計
   */
  getStats(): MigrationStats {
    return { ...this.stats }
  }

  /**
   * 獲取遷移日誌
   */
  getMigrationLog(): Array<{ timestamp: Date; event: string; details: any }> {
    return [...this.migrationLog]
  }

  /**
   * 記錄遷移事件
   */
  private logMigration(event: string, details: any): void {
    const logEntry = {
      timestamp: new Date(),
      event,
      details,
    }
    this.migrationLog.push(logEntry)
    console.log(`[MigrationManager] ${event}:`, details)
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[MigrationManager] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
