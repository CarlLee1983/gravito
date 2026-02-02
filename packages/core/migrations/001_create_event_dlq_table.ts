/**
 * @gravito/core - Event DLQ Migration
 *
 * 創建死信隊列（Dead Letter Queue）數據表
 * 用於持久化失敗的事件，支持重試和手動處理
 */

import { Schema } from '@gravito/atlas'

/**
 * 創建 event_dlq 資料表
 *
 * 此表用於存儲失敗的事件和重試信息
 */
export default class CreateEventDlqTable {
  /**
   * 執行遷移：創建 event_dlq 表
   */
  async up(): Promise<void> {
    await Schema.create('event_dlq', (table) => {
      // ─────────────────────────────────────────────────────────────────
      // 主鍵
      // ─────────────────────────────────────────────────────────────────
      table.increments('id').primary().comment('主鍵')

      // ─────────────────────────────────────────────────────────────────
      // 事件信息
      // ─────────────────────────────────────────────────────────────────
      table.string('dlq_id', 36).unique().notNullable().comment('DLQ 事件 ID (UUID)')
      table.string('event_name', 255).notNullable().comment('事件名稱 (e.g., order:created)')
      table.json('event_payload').notNullable().comment('事件數據負載')
      table.json('event_options').nullable().comment('事件選項 (priority, retry config 等)')

      // ─────────────────────────────────────────────────────────────────
      // 重試信息
      // ─────────────────────────────────────────────────────────────────
      table.integer('attempt_count').defaultTo(1).comment('當前重試次數')
      table.integer('max_retries').defaultTo(3).comment('配置的最大重試次數')
      table.timestamp('next_retry_at').nullable().comment('下次重試的時間')
      table.json('last_error').nullable().comment('最後一次錯誤的詳細信息')

      // ─────────────────────────────────────────────────────────────────
      // 狀態追蹤
      // ─────────────────────────────────────────────────────────────────
      table
        .enum('status', ['pending', 'requeued', 'resolved', 'abandoned'])
        .defaultTo('pending')
        .comment('事件狀態')
      table.text('resolution_notes').nullable().comment('解決說明或手動備註')

      // ─────────────────────────────────────────────────────────────────
      // 時間戳
      // ─────────────────────────────────────────────────────────────────
      table.timestamp('failed_at').notNullable().comment('事件失敗的時間')

      // 使用標準 timestamps() 方法創建 created_at 和 updated_at
      table.timestamps().comment('DLQ 記錄的創建和更新時間')

      // ─────────────────────────────────────────────────────────────────
      // 索引
      // ─────────────────────────────────────────────────────────────────
      table.index('event_name').comment('事件名稱索引，用於按事件查詢')
      table.index('status').comment('狀態索引，用於篩選待處理事件')
      table.index('next_retry_at').comment('下次重試時間索引，用於查詢待重試事件')
      table.index('failed_at').comment('失敗時間索引，用於時間范圍查詢')
      table.index(['event_name', 'status']).comment('複合索引，用於快速查詢特定事件的特定狀態')
      table.index(['status', 'next_retry_at']).comment('複合索引，用於查詢待重試的事件')
    })
  }

  /**
   * 回滾遷移：刪除 event_dlq 表
   */
  async down(): Promise<void> {
    await Schema.dropIfExists('event_dlq')
  }
}
