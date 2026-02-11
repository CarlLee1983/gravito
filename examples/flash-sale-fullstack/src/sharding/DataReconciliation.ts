/**
 * Data Reconciliation
 * 數據對帳和驗證系統
 *
 * 職責：
 * 1. 驗證源和目標數據一致性
 * 2. 檢測數據差異
 * 3. 生成對帳報告
 * 4. 支持批量修復
 */

export interface ReconciliationConfig {
  sampleSize?: number // 取樣大小，0 為全量驗證
  checksumAlgorithm?: 'md5' | 'sha256'
  batchSize?: number // 每批驗證記錄數
  toleranceLevel?: number // 容差：允許的最大差異百分比
}

export interface ReconciliationResult {
  totalRecords: number
  matchedRecords: number
  mismatchedRecords: number
  missingInTarget: number
  missingInSource: number
  matchRate: number // 匹配率 (%)
  details: MismatchDetail[]
  startTime: Date
  endTime: Date
  duration: number // 毫秒
  status: 'passed' | 'failed' | 'warning'
}

export interface MismatchDetail {
  recordId: string | number
  shardId: number
  reason: 'checksum_mismatch' | 'missing_in_target' | 'missing_in_source' | 'schema_mismatch'
  sourceChecksum?: string
  targetChecksum?: string
  sourceData?: any
  targetData?: any
}

/**
 * 數據對帳系統
 */
export class DataReconciliation {
  private config: Required<ReconciliationConfig>
  private mismatches: MismatchDetail[] = []
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(config: ReconciliationConfig = {}) {
    this.config = {
      sampleSize: config.sampleSize ?? 0, // 0 = 全量
      checksumAlgorithm: config.checksumAlgorithm ?? 'md5',
      batchSize: config.batchSize ?? 1000,
      toleranceLevel: config.toleranceLevel ?? 5, // 5% 容差
    }
  }

  /**
   * 執行完整對帳
   */
  async reconcile(
    sourceData: Map<string, any>,
    targetData: Map<string, any>
  ): Promise<ReconciliationResult> {
    const startTime = new Date()
    this.mismatches = []

    const sourceRecords = Array.from(sourceData.entries())
    const targetRecords = Array.from(targetData.entries())

    const totalRecords = sourceRecords.length
    let matchedRecords = 0

    // 取樣驗證
    const recordsToCheck =
      this.config.sampleSize === 0
        ? sourceRecords
        : this.sampleRecords(sourceRecords, this.config.sampleSize)

    // 批量對帳
    for (let i = 0; i < recordsToCheck.length; i += this.config.batchSize) {
      const batch = recordsToCheck.slice(i, i + this.config.batchSize)

      for (const [recordId, sourceValue] of batch) {
        const targetValue = targetData.get(recordId)

        if (!targetValue) {
          this.mismatches.push({
            recordId,
            shardId: this.getShardId(recordId),
            reason: 'missing_in_target',
          })
          continue
        }

        // 驗證數據
        if (this.compareRecords(sourceValue, targetValue)) {
          matchedRecords++
        } else {
          this.mismatches.push({
            recordId,
            shardId: this.getShardId(recordId),
            reason: 'checksum_mismatch',
            sourceChecksum: this.computeChecksum(sourceValue),
            targetChecksum: this.computeChecksum(targetValue),
            sourceData: sourceValue,
            targetData: targetValue,
          })
        }
      }

      this.emit('reconciliation:progress', {
        processed: Math.min(i + this.config.batchSize, recordsToCheck.length),
        total: recordsToCheck.length,
      })
    }

    // 檢查目標中多餘的記錄
    const sourceKeys = new Set(sourceRecords.map(([key]) => key))
    for (const [recordId] of targetRecords) {
      if (!sourceKeys.has(recordId)) {
        this.mismatches.push({
          recordId,
          shardId: this.getShardId(recordId),
          reason: 'missing_in_source',
        })
      }
    }

    const endTime = new Date()
    const matchRate = (matchedRecords / recordsToCheck.length) * 100

    const result: ReconciliationResult = {
      totalRecords,
      matchedRecords,
      mismatchedRecords: this.mismatches.filter((m) => m.reason === 'checksum_mismatch').length,
      missingInTarget: this.mismatches.filter((m) => m.reason === 'missing_in_target').length,
      missingInSource: this.mismatches.filter((m) => m.reason === 'missing_in_source').length,
      matchRate: Math.round(matchRate * 100) / 100,
      details: this.mismatches,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      status: this.getReconciliationStatus(matchRate),
    }

    this.emit('reconciliation:completed', result)
    return result
  }

  /**
   * 驗證指定分片的數據
   */
  async reconcileShard(
    shardId: number,
    sourceData: any[],
    targetData: any[]
  ): Promise<ReconciliationResult> {
    const sourceMap = new Map(sourceData.map((r, i) => [i, r]))
    const targetMap = new Map(targetData.map((r, i) => [i, r]))
    return this.reconcile(sourceMap, targetMap)
  }

  /**
   * 取樣驗證
   */
  private sampleRecords(records: [string, any][], sampleSize: number): [string, any][] {
    if (records.length <= sampleSize) {
      return records
    }

    const step = Math.floor(records.length / sampleSize)
    const sampled: [string, any][] = []

    for (let i = 0; i < records.length; i += step) {
      sampled.push(records[i])
      if (sampled.length >= sampleSize) break
    }

    return sampled
  }

  /**
   * 比較記錄是否相同
   */
  private compareRecords(source: any, target: any): boolean {
    const sourceChecksum = this.computeChecksum(source)
    const targetChecksum = this.computeChecksum(target)
    return sourceChecksum === targetChecksum
  }

  /**
   * 計算數據檢查和
   */
  private computeChecksum(data: any): string {
    const serialized = JSON.stringify(data)
    let hash = 0

    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16)
  }

  /**
   * 獲取記錄所屬分片
   */
  private getShardId(recordId: string | number): number {
    const id = typeof recordId === 'string' ? parseInt(recordId, 10) : recordId
    return id % 8
  }

  /**
   * 獲取對帳狀態
   */
  private getReconciliationStatus(matchRate: number): 'passed' | 'failed' | 'warning' {
    const threshold = 100 - this.config.toleranceLevel

    if (matchRate >= 100) {
      return 'passed'
    } else if (matchRate >= threshold) {
      return 'warning'
    } else {
      return 'failed'
    }
  }

  /**
   * 生成對帳報告
   */
  generateReport(result: ReconciliationResult): string {
    const lines = [
      '='.repeat(60),
      'DATA RECONCILIATION REPORT',
      '='.repeat(60),
      '',
      `Status: ${result.status.toUpperCase()}`,
      `Duration: ${result.duration}ms`,
      `Timestamp: ${result.startTime.toISOString()}`,
      '',
      '--- SUMMARY ---',
      `Total Records: ${result.totalRecords}`,
      `Match Rate: ${result.matchRate}%`,
      `Matched: ${result.matchedRecords}`,
      `Mismatches: ${result.mismatchedRecords}`,
      `Missing in Target: ${result.missingInTarget}`,
      `Missing in Source: ${result.missingInSource}`,
      '',
      '--- DETAILS ---',
    ]

    if (result.details.length > 0) {
      // 按類型分組
      const byReason = new Map<string, MismatchDetail[]>()
      for (const detail of result.details) {
        if (!byReason.has(detail.reason)) {
          byReason.set(detail.reason, [])
        }
        byReason.get(detail.reason)!.push(detail)
      }

      for (const [reason, details] of byReason) {
        lines.push(`\n${reason}: ${details.length} records`)
        // 顯示前 5 條
        for (let i = 0; i < Math.min(5, details.length); i++) {
          const detail = details[i]
          lines.push(`  - Record ${detail.recordId} (Shard ${detail.shardId}): ${detail.reason}`)
        }
        if (details.length > 5) {
          lines.push(`  ... and ${details.length - 5} more`)
        }
      }
    } else {
      lines.push('All records matched! ✅')
    }

    lines.push('', '='.repeat(60))
    return lines.join('\n')
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
          console.error(`[DataReconciliation] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
