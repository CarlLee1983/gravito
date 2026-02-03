import type { DeadLetterQueueManager, DLQManagerFilter, DLQRecord } from '@gravito/core'
import pc from 'picocolors'

/**
 * DLQ 命令顯示選項
 */
export interface DLQDisplayOptions {
  /** 是否以 JSON 格式輸出 */
  json?: boolean
}

/**
 * Dead Letter Queue Management Command
 *
 * 提供管理死信隊列（DLQ）中失敗事件的操作：
 * - 列出 DLQ 條目並支持過濾
 * - 重新入隊單個或批量失敗事件
 * - 標記事件為已解決或已放棄
 * - 刪除 DLQ 條目
 * - 查看統計信息
 *
 * @example
 * ```typescript
 * const dlqCommand = new EventDLQCommand(dlqManager)
 *
 * // 列出所有 DLQ 條目
 * await dlqCommand.list({})
 *
 * // 列出特定事件的條目
 * await dlqCommand.list({ eventName: 'order:created', status: 'pending' })
 *
 * // 重新入隊特定條目
 * await dlqCommand.requeue('550e8400-e29b-41d4-a716-446655440000')
 *
 * // 批量重新入隊
 * await dlqCommand.requeueAll({ eventName: 'order:created' })
 *
 * // 標記為已解決
 * await dlqCommand.resolve('uuid', 'Manual fix applied')
 *
 * // 查看統計
 * await dlqCommand.stats()
 * ```
 *
 * @since 1.2.0
 * @public
 */
export class EventDLQCommand {
  constructor(private dlqManager: DeadLetterQueueManager) {}

  /**
   * 列出死信隊列條目
   *
   * @param filter - DLQ 條目的過濾選項
   * @param options - 顯示選項
   */
  async list(filter: DLQManagerFilter = {}, options: DLQDisplayOptions = {}): Promise<void> {
    try {
      const entries = await this.dlqManager.list(filter)

      if (entries.length === 0) {
        console.log(pc.yellow('No DLQ entries found.'))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(entries, null, 2))
        return
      }

      // 以表格形式顯示
      console.log(pc.bold('\nDead Letter Queue Entries'))
      console.log(pc.gray('-'.repeat(120)))

      const headers = ['ID', 'Event', 'Status', 'Retries', 'Failed At', 'Error Message']
      console.log(headers.map((h) => pc.bold(h.padEnd(18))).join(' | '))
      console.log(pc.gray('-'.repeat(120)))

      for (const entry of entries) {
        const failedAt = new Date(entry.failed_at).toISOString().substring(0, 19)
        const errorMsg = this.getErrorMessage(entry).substring(0, 30)
        const statusColor = this.getStatusColor(entry.status)

        console.log(
          [
            entry.dlq_id.substring(0, 16),
            entry.event_name.substring(0, 18),
            statusColor(entry.status.padEnd(10)),
            String(entry.attempt_count).padStart(3),
            failedAt,
            errorMsg,
          ].join(' | ')
        )
      }

      console.log(pc.gray('-'.repeat(120)))
      console.log(pc.green(`Total: ${entries.length} entries`))
      console.log()
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
    }
  }

  /**
   * 顯示特定 DLQ 條目的詳細信息
   *
   * @param entryId - DLQ 條目的 UUID
   * @param options - 顯示選項
   */
  async show(entryId: string, options: DLQDisplayOptions = {}): Promise<void> {
    try {
      const entry = await this.dlqManager.getById(entryId)

      if (!entry) {
        console.log(pc.red(`Entry not found: ${entryId}`))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(entry, null, 2))
        return
      }

      console.log(pc.bold('\nDLQ Entry Details'))
      console.log(pc.gray('-'.repeat(80)))

      const details = [
        ['ID', entry.dlq_id],
        ['Event', entry.event_name],
        ['Status', entry.status],
        ['Attempt Count', String(entry.attempt_count)],
        ['Max Retries', String(entry.max_retries)],
        ['Failed At', new Date(entry.failed_at).toISOString()],
        ['Created At', new Date(entry.created_at).toISOString()],
        ['Updated At', new Date(entry.updated_at).toISOString()],
        ['Next Retry At', entry.next_retry_at || 'N/A'],
        ['Resolution Notes', entry.resolution_notes || 'N/A'],
        ['Error Code', this.getErrorCode(entry) || 'N/A'],
        ['Error Message', this.getErrorMessage(entry)],
      ]

      for (const [key, value] of details) {
        console.log(`${pc.bold(key.padEnd(20))}: ${value}`)
      }

      console.log(pc.gray('-'.repeat(80)))

      console.log(pc.bold('\nPayload:'))
      console.log(JSON.stringify(entry.event_payload, null, 2))

      const stack = this.getErrorStack(entry)
      if (stack) {
        console.log(pc.bold('\nStack Trace:'))
        console.log(pc.gray(stack))
      }

      console.log()
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
    }
  }

  /**
   * 重新入隊特定 DLQ 條目
   *
   * @param entryId - DLQ 條目的 UUID
   */
  async requeue(entryId: string): Promise<void> {
    try {
      await this.dlqManager.requeue(entryId)
      console.log(pc.green(`Successfully requeued: ${entryId}`))
    } catch {
      console.log(pc.red(`Entry not found or failed to requeue: ${entryId}`))
    }
  }

  /**
   * 批量重新入隊符合過濾條件的 DLQ 條目
   *
   * @param filter - 過濾選項
   */
  async requeueAll(filter: DLQManagerFilter = {}): Promise<void> {
    try {
      const result = await this.dlqManager.retryBatch(filter)

      if (result.total === 0) {
        console.log(pc.yellow('No entries found to requeue.'))
        return
      }

      console.log(pc.cyan(`Requeuing ${result.total} entries...`))
      console.log(pc.green(`\nRequeue completed:`))
      console.log(`  Success: ${result.succeeded}`)
      console.log(`  Failed: ${result.failed}`)
      console.log()
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
    }
  }

  /**
   * 標記 DLQ 條目為已解決
   *
   * @param entryId - DLQ 條目的 UUID
   * @param notes - 解決說明
   */
  async resolve(entryId: string, notes?: string): Promise<void> {
    try {
      await this.dlqManager.resolve(entryId, notes)
      console.log(pc.green(`Entry resolved: ${entryId}`))
    } catch {
      console.log(pc.red(`Entry not found: ${entryId}`))
    }
  }

  /**
   * 放棄 DLQ 條目（不再重試）
   *
   * @param entryId - DLQ 條目的 UUID
   * @param reason - 放棄原因
   */
  async abandon(entryId: string, reason?: string): Promise<void> {
    try {
      await this.dlqManager.abandon(entryId, reason)
      console.log(pc.green(`Entry abandoned: ${entryId}`))
    } catch {
      console.log(pc.red(`Entry not found: ${entryId}`))
    }
  }

  /**
   * 刪除特定 DLQ 條目
   *
   * @param entryId - DLQ 條目的 UUID
   */
  async delete(entryId: string): Promise<void> {
    try {
      const result = await this.dlqManager.deleteEntry(entryId)

      if (result) {
        console.log(pc.green(`Deleted entry: ${entryId}`))
      } else {
        console.log(pc.red(`Entry not found: ${entryId}`))
      }
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
    }
  }

  /**
   * 刪除所有符合過濾條件的 DLQ 條目
   *
   * 需要確認以防止誤刪。支持 --force 標誌跳過互動式確認。
   *
   * @param filter - 過濾選項
   * @param confirm - 是否跳過確認（通常由 --force 標誌設置）
   */
  async deleteAll(filter: DLQManagerFilter = {}, confirm = false): Promise<void> {
    try {
      const stats = await this.dlqManager.getStats()

      if (stats.total === 0) {
        console.log(pc.yellow('No entries found.'))
        return
      }

      const summary = filter.eventName ? `event '${filter.eventName}'` : 'all'
      const totalToDelete = filter.eventName
        ? (stats.byEvent?.[filter.eventName] ?? 0)
        : stats.total

      // 如果未指定確認標誌，需要進行確認
      if (!confirm) {
        console.log(
          pc.yellow(`\n⚠️  WARNING: This will permanently delete ${totalToDelete} DLQ entries.`)
        )
        console.log(pc.dim(`   Target: ${summary}`))
        console.log(pc.dim(`   This action cannot be undone.`))

        // 要求使用者輸入 'yes' 進行確認
        console.log('\nType "yes" to confirm deletion, or anything else to cancel:')

        // 簡單的同步確認（基於現有 CLI 模式）
        console.log(pc.cyan('Use --force flag to skip confirmation:'))
        console.log(
          pc.cyan(
            `  gravito event:dlq:clear --force${filter.eventName ? ` --event ${filter.eventName}` : ''}`
          )
        )
        return
      }

      // 確認已給予，執行刪除
      console.log(pc.cyan(`Deleting ${totalToDelete} entries for ${summary}...`))
      const deleted = await this.dlqManager.clear(true)
      console.log(pc.green(`✓ Successfully deleted ${deleted} entries`))

      // 審計日誌
      console.log(pc.dim(`  [AUDIT] Operation timestamp: ${new Date().toISOString()}`))
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
      process.exit(1)
    }
  }

  /**
   * 獲取 DLQ 統計信息
   *
   * @param options - 顯示選項
   */
  async stats(options: DLQDisplayOptions = {}): Promise<void> {
    try {
      const stats = await this.dlqManager.getStats()

      if (stats.total === 0) {
        console.log(pc.yellow('DLQ is empty.'))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2))
        return
      }

      console.log(pc.bold('\nDLQ Statistics'))
      console.log(pc.gray('-'.repeat(50)))

      console.log(`Total DLQ Entries: ${pc.bold(String(stats.total))}`)

      // 按狀態分組
      if (Object.keys(stats.byStatus).length > 0) {
        console.log(pc.gray('\nBy Status:'))
        for (const [status, count] of Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1])) {
          const percentage = ((count / stats.total) * 100).toFixed(1)
          const color = this.getStatusColor(status as DLQRecord['status'])
          console.log(
            `  ${color(status.padEnd(15))}: ${String(count).padStart(5)} (${percentage}%)`
          )
        }
      }

      // 按事件名稱分組
      if (Object.keys(stats.byEvent).length > 0) {
        console.log(pc.gray('\nBy Event Type:'))
        for (const [event, count] of Object.entries(stats.byEvent).sort((a, b) => b[1] - a[1])) {
          const percentage = ((count / stats.total) * 100).toFixed(1)
          console.log(`  ${event.padEnd(30)}: ${String(count).padStart(5)} (${percentage}%)`)
        }
      }

      console.log(pc.gray('-'.repeat(50)))
      console.log()
    } catch (error) {
      console.log(pc.red(`Error: ${(error as Error).message}`))
    }
  }

  // ===========================================================================
  // 私有輔助方法
  // ===========================================================================

  /**
   * 根據狀態返回對應的顏色函數
   */
  private getStatusColor(status: DLQRecord['status']): (text: string) => string {
    switch (status) {
      case 'pending':
        return pc.yellow
      case 'requeued':
        return pc.cyan
      case 'resolved':
        return pc.green
      case 'abandoned':
        return pc.red
      default:
        return pc.gray
    }
  }

  /**
   * 從 DLQ 記錄中提取錯誤訊息
   */
  private getErrorMessage(entry: DLQRecord): string {
    const error = entry.last_error as Record<string, unknown> | null
    if (error && typeof error.message === 'string') {
      return error.message
    }
    return 'Unknown error'
  }

  /**
   * 從 DLQ 記錄中提取錯誤代碼
   */
  private getErrorCode(entry: DLQRecord): string | undefined {
    const error = entry.last_error as Record<string, unknown> | null
    if (error && typeof error.code === 'string') {
      return error.code
    }
    return undefined
  }

  /**
   * 從 DLQ 記錄中提取錯誤堆疊
   */
  private getErrorStack(entry: DLQRecord): string | undefined {
    const error = entry.last_error as Record<string, unknown> | null
    if (error && typeof error.stack === 'string') {
      return error.stack
    }
    return undefined
  }
}
