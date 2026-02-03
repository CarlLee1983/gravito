/**
 * @gravito/core - DLQ Integration Test Database Helper
 *
 * 提供 SQLite 內存數據庫設置工具，用於 DLQ 整合測試
 * 支持創建、清理和關閉連接
 */

import type { ConnectionContract } from '@gravito/atlas'
import { DB, Schema } from '@gravito/atlas'

/**
 * 測試連接名稱前綴
 */
const TEST_CONNECTION_PREFIX = 'dlq_integration_test'

/**
 * 生成唯一的連接名稱
 */
export function generateConnectionName(): string {
  return `${TEST_CONNECTION_PREFIX}_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

/**
 * 創建測試數據庫連接
 *
 * 使用 SQLite 內存數據庫進行測試，確保每個測試都有獨立的環境
 *
 * @param connectionName - 連接名稱
 * @returns ConnectionContract 實例
 *
 * @example
 * ```typescript
 * const name = generateConnectionName()
 * const connection = await createTestConnection(name)
 * ```
 */
export async function createTestConnection(connectionName: string): Promise<ConnectionContract> {
  // 添加 SQLite 內存連接
  DB.addConnection(connectionName, {
    driver: 'sqlite',
    database: ':memory:',
    useNativeDriver: false, // 禁用原生驅動以確保兼容性
  })

  const connection = DB.connection(connectionName)
  await connection.connect()

  return connection
}

/**
 * 設置 DLQ 資料表
 *
 * 創建 event_dlq 表，使用與生產環境相同的結構
 *
 * @param connectionName - 連接名稱
 *
 * @example
 * ```typescript
 * await setupDlqTable(connectionName)
 * ```
 */
export async function setupDlqTable(connectionName: string): Promise<void> {
  // 設置 Schema 連接
  Schema.connection(connectionName)

  // 創建 event_dlq 資料表
  await Schema.create('event_dlq', (table) => {
    // 主鍵
    table.id()

    // DLQ 識別符 - UUID 且唯一
    table.string('dlq_id', 36).unique()

    // 事件資訊
    table.string('event_name', 255)
    table.json('event_payload')
    table.json('event_options').nullable()

    // 重試配置
    table.integer('attempt_count').default(0)
    table.integer('max_retries').default(3)
    table.timestamp('next_retry_at').nullable()

    // 錯誤資訊
    table.json('last_error').nullable()

    // 狀態管理 (SQLite 不支持 ENUM，使用 string)
    table.string('status', 20).default('pending')
    table.text('resolution_notes').nullable()

    // 時間戳記
    table.timestamp('failed_at')
    table.timestamps()
  })
}

/**
 * 清理 DLQ 資料表數據
 *
 * 刪除所有測試數據，但保留表結構
 *
 * @param connection - 數據庫連接
 *
 * @example
 * ```typescript
 * await cleanupDlqTable(connection)
 * ```
 */
export async function cleanupDlqTable(connection: ConnectionContract): Promise<void> {
  await connection.table('event_dlq').delete()
}

/**
 * 刪除 DLQ 資料表
 *
 * @param connectionName - 連接名稱
 *
 * @example
 * ```typescript
 * await dropDlqTable(connectionName)
 * ```
 */
export async function dropDlqTable(connectionName: string): Promise<void> {
  Schema.connection(connectionName)
  await Schema.dropIfExists('event_dlq')
}

/**
 * 關閉數據庫連接
 *
 * @param connectionName - 連接名稱
 *
 * @example
 * ```typescript
 * await closeConnection(connectionName)
 * ```
 */
export async function closeConnection(connectionName: string): Promise<void> {
  await DB.disconnect(connectionName)
}

/**
 * 創建完整的測試環境
 *
 * 一次性創建連接和設置表結構
 *
 * @returns 包含連接名稱和連接實例的對象
 *
 * @example
 * ```typescript
 * const { connectionName, connection } = await createTestEnvironment()
 * // 執行測試...
 * await cleanupTestEnvironment(connectionName)
 * ```
 */
export async function createTestEnvironment(): Promise<{
  connectionName: string
  connection: ConnectionContract
}> {
  const connectionName = generateConnectionName()
  const connection = await createTestConnection(connectionName)
  await setupDlqTable(connectionName)

  return { connectionName, connection }
}

/**
 * 清理測試環境
 *
 * 關閉連接並清理資源
 *
 * @param connectionName - 連接名稱
 *
 * @example
 * ```typescript
 * await cleanupTestEnvironment(connectionName)
 * ```
 */
export async function cleanupTestEnvironment(connectionName: string): Promise<void> {
  try {
    await dropDlqTable(connectionName)
  } catch {
    // 忽略表不存在的錯誤
  }
  await closeConnection(connectionName)
}

/**
 * 獲取表中的記錄數量
 *
 * @param connection - 數據庫連接
 * @returns 記錄數量
 */
export async function getRecordCount(connection: ConnectionContract): Promise<number> {
  return connection.table('event_dlq').count()
}

/**
 * 獲取所有記錄
 *
 * @param connection - 數據庫連接
 * @returns 所有 DLQ 記錄
 */
export async function getAllRecords(connection: ConnectionContract): Promise<unknown[]> {
  return connection.table('event_dlq').get()
}
