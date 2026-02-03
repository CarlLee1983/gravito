/**
 * Event DLQ Table Migration
 *
 * 創建 event_dlq 資料表用於存儲死信隊列事件
 * 支援事件系統的可靠性機制
 *
 * @description
 * 此遷移創建 Dead Letter Queue (DLQ) 表，用於：
 * - 存儲處理失敗的事件
 * - 支援重試機制
 * - 提供事件追蹤和診斷
 *
 * 表結構：
 * - id: 自增主鍵
 * - dlq_id: UUID 唯一識別符
 * - event_name: 事件名稱
 * - event_payload: 事件負載（JSON）
 * - event_options: 事件選項（JSON）
 * - attempt_count: 嘗試次數
 * - max_retries: 最大重試次數
 * - next_retry_at: 下次重試時間
 * - last_error: 最後一次錯誤（JSON）
 * - status: 狀態（pending/requeued/resolved/abandoned）
 * - resolution_notes: 解決說明
 * - failed_at: 失敗時間
 * - created_at: 創建時間
 * - updated_at: 更新時間
 *
 * 索引：
 * - dlq_id (unique)
 * - event_name
 * - status
 * - failed_at
 * - (event_name, status) 複合索引
 */

import type { Migration } from '../src/migration'
import { Blueprint, Schema } from '../src/schema'

/**
 * DLQ 狀態枚舉值
 */
const DLQ_STATUS_VALUES = ['pending', 'requeued', 'resolved', 'abandoned'] as const

/**
 * 資料表名稱
 */
const TABLE_NAME = 'event_dlq'

/**
 * CreateEventDlqTable Migration
 *
 * 實現 Migration 介面，提供 up() 和 down() 方法
 * 額外提供 getBlueprint() 方法供測試使用
 */
export default class CreateEventDlqTable implements Migration {
  /**
   * 執行遷移 - 創建 event_dlq 資料表
   */
  async up(): Promise<void> {
    await Schema.create(TABLE_NAME, (table) => {
      this.defineColumns(table)
      this.defineIndexes(table)
    })
  }

  /**
   * 回滾遷移 - 刪除 event_dlq 資料表
   */
  async down(): Promise<void> {
    await Schema.dropIfExists(TABLE_NAME)
  }

  /**
   * 獲取 Blueprint 實例（供測試用）
   *
   * 此方法允許測試直接檢查表結構，
   * 而不需要實際連接資料庫
   */
  getBlueprint(): Blueprint {
    const blueprint = new Blueprint(TABLE_NAME)
    this.defineColumns(blueprint)
    this.defineIndexes(blueprint)
    return blueprint
  }

  /**
   * 定義資料表欄位
   */
  private defineColumns(table: Blueprint): void {
    // 主鍵
    table.id()

    // DLQ 識別符 - UUID 且唯一
    table.uuid('dlq_id').unique()

    // 事件資訊
    table.string('event_name', 255)
    table.jsonb('event_payload')
    table.jsonb('event_options')

    // 重試配置
    table.integer('attempt_count').default(0)
    table.integer('max_retries').default(3)
    table.timestamp('next_retry_at').nullable()

    // 錯誤資訊
    table.jsonb('last_error').nullable()

    // 狀態管理
    table.enum('status', [...DLQ_STATUS_VALUES]).default('pending')
    table.text('resolution_notes').nullable()

    // 時間戳記
    table.timestamp('failed_at')
    table.timestamps()
  }

  /**
   * 定義資料表索引
   */
  private defineIndexes(table: Blueprint): void {
    // 單欄位索引
    table.index('event_name', `${TABLE_NAME}_event_name_index`)
    table.index('status', `${TABLE_NAME}_status_index`)
    table.index('failed_at', `${TABLE_NAME}_failed_at_index`)

    // 複合索引 - 用於查詢特定事件的特定狀態
    table.index(['event_name', 'status'], `${TABLE_NAME}_event_name_status_index`)
  }
}
