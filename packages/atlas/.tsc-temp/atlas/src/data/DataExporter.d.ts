/**
 * DataExporter
 * @description 提供 JSONL 格式的資料導出與導入工具
 */
import type { ConnectionContract } from '../types'
/**
 * 導出選項
 */
export interface ExportOptions {
  /** 資料表名稱（必須） */
  table: string
  /** 輸出檔案路徑（必須） */
  output: string
  /** 每批次讀取筆數（預設 1000） */
  batchSize?: number
  /** WHERE 條件子句（可選，例如 "status = 'active'"） */
  where?: string
  /** 要導出的欄位列表（可選，預設全部） */
  columns?: string[]
}
/**
 * 導入選項
 */
export interface ImportOptions {
  /** 輸入 JSONL 檔案路徑（必須） */
  input: string
  /** 目標資料表名稱（必須） */
  table: string
  /** 每批次寫入筆數（預設 500） */
  batchSize?: number
  /** 衝突處理策略（預設 'error'） */
  onConflict?: 'skip' | 'update' | 'error'
}
/**
 * 導出結果
 */
export interface ExportResult {
  rows: number
}
/**
 * 導入結果
 */
export interface ImportResult {
  rows: number
}
/**
 * DataExporter
 * @description 負責將資料表資料導出為 JSONL 格式，或從 JSONL 檔案導入資料
 *
 * @example
 * ```typescript
 * const exporter = new DataExporter(connection)
 *
 * // 導出
 * const result = await exporter.exportToJsonl({
 *   table: 'users',
 *   output: 'users.jsonl',
 *   batchSize: 500,
 *   where: "status = 'active'",
 *   columns: ['id', 'email', 'created_at'],
 * })
 * console.log(`已導出 ${result.rows} 筆`)
 *
 * // 導入
 * const imported = await exporter.importFromJsonl({
 *   input: 'users.jsonl',
 *   table: 'users',
 *   batchSize: 500,
 *   onConflict: 'skip',
 * })
 * console.log(`已導入 ${imported.rows} 筆`)
 * ```
 */
export declare class DataExporter {
  private readonly connection
  constructor(connection: ConnectionContract)
  /**
   * 將資料表導出為 JSONL 格式
   *
   * @param options - 導出選項
   * @returns 已導出的資料列數
   */
  exportToJsonl(options: ExportOptions): Promise<ExportResult>
  /**
   * 從 JSONL 檔案導入資料
   *
   * @param options - 導入選項
   * @returns 已導入的資料列數
   */
  importFromJsonl(options: ImportOptions): Promise<ImportResult>
  /**
   * 組建欄位清單 SQL 片段
   *
   * @param columns - 欄位名稱列表
   * @returns SQL 欄位選取字串
   */
  private buildColumnList
  /**
   * 組建 SELECT SQL 查詢
   *
   * @param table - 資料表名稱（已驗證）
   * @param columnList - 欄位清單（已驗證）
   * @param where - WHERE 條件（可選）
   * @returns 完整 SELECT SQL 字串
   */
  private buildSelectSql
  /**
   * 將資料列寫入 JSONL 檔案
   * 使用 Bun.file writer 進行高效寫入
   *
   * @param output - 輸出檔案路徑
   * @param rows - 資料列陣列
   * @param batchSize - 每批次寫入筆數
   */
  private writeJsonlFile
  /**
   * 讀取並解析 JSONL 檔案
   * 優先使用 Bun.JSONL.parse()，降級為逐行解析
   *
   * @param input - 輸入檔案路徑
   * @returns 解析後的資料列陣列
   */
  private readJsonlFile
  /**
   * 使用 Node.js fs 模組讀取檔案
   *
   * @param filePath - 檔案路徑
   * @returns 檔案內容字串
   */
  private readFileNode
  /**
   * 逐行解析 JSONL 格式內容
   *
   * @param content - JSONL 字串內容
   * @returns 解析後的物件陣列
   */
  private parseJsonlLines
  /**
   * 批次 INSERT 資料
   * 使用參數化查詢防止 SQL injection
   *
   * @param table - 資料表名稱（已驗證）
   * @param columns - 欄位名稱列表（已驗證）
   * @param batch - 當批次的資料列
   * @param onConflict - 衝突處理策略
   * @returns 成功插入的筆數
   */
  private insertBatch
  /**
   * 組建 INSERT SQL 語句
   *
   * @param table - 資料表名稱（已驗證）
   * @param columnsSql - 欄位清單 SQL 字串
   * @param placeholders - 參數佔位符字串（如 $1, $2, ...）
   * @param onConflict - 衝突處理策略
   * @returns 完整 INSERT SQL 字串
   */
  private buildInsertSql
}
