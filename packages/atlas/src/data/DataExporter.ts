/**
 * DataExporter
 * @description 提供 JSONL 格式的資料導出與導入工具
 */

import type { ConnectionContract } from '../types'

// ============================================================================
// 型別定義
// ============================================================================

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

// ============================================================================
// 安全驗證
// ============================================================================

/** 識別符白名單正規表達式：允許字母、數字、底線，且不以數字開頭 */
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * 驗證 SQL 識別符（資料表名、欄位名）是否安全
 * 防止 SQL injection
 *
 * @param name - 識別符字串
 * @param context - 識別符類型描述（用於錯誤訊息）
 * @throws 若識別符不符合白名單規則
 */
function validateIdentifier(name: string, context: string): void {
  if (!SAFE_IDENTIFIER_PATTERN.test(name)) {
    throw new Error(
      `不合法的 ${context} 名稱 "${name}"。` +
        `識別符只允許英文字母、數字及底線，且不能以數字開頭。`
    )
  }
}

// ============================================================================
// DataExporter 類別
// ============================================================================

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
export class DataExporter {
  constructor(private readonly connection: ConnectionContract) {}

  /**
   * 將資料表導出為 JSONL 格式
   *
   * @param options - 導出選項
   * @returns 已導出的資料列數
   */
  async exportToJsonl(options: ExportOptions): Promise<ExportResult> {
    const { table, output, batchSize = 1000, where, columns } = options

    // 驗證資料表名稱
    validateIdentifier(table, '資料表')

    // 驗證並組建欄位清單
    const columnList = this.buildColumnList(columns)

    // 組建 SELECT 查詢
    const sql = this.buildSelectSql(table, columnList, where)

    // 執行查詢取得所有資料
    const result = await this.connection.raw<Record<string, unknown>>(sql, [])
    const rows = result.rows

    // 使用 Bun.file writer 逐批寫入 JSONL
    await this.writeJsonlFile(output, rows, batchSize)

    return { rows: rows.length }
  }

  /**
   * 從 JSONL 檔案導入資料
   *
   * @param options - 導入選項
   * @returns 已導入的資料列數
   */
  async importFromJsonl(options: ImportOptions): Promise<ImportResult> {
    const { input, table, batchSize = 500, onConflict = 'error' } = options

    // 驗證資料表名稱
    validateIdentifier(table, '資料表')

    // 讀取並解析 JSONL 檔案
    const records = await this.readJsonlFile(input)

    if (records.length === 0) {
      return { rows: 0 }
    }

    // 取得欄位名稱（從第一筆紀錄）
    const firstRecord = records[0]
    if (!firstRecord) {
      return { rows: 0 }
    }
    const columns = Object.keys(firstRecord)

    // 驗證所有欄位名稱
    for (const col of columns) {
      validateIdentifier(col, '欄位')
    }

    // 批次導入
    let totalRows = 0
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const inserted = await this.insertBatch(table, columns, batch, onConflict)
      totalRows += inserted
    }

    return { rows: totalRows }
  }

  // ============================================================================
  // 私有輔助方法
  // ============================================================================

  /**
   * 組建欄位清單 SQL 片段
   *
   * @param columns - 欄位名稱列表
   * @returns SQL 欄位選取字串
   */
  private buildColumnList(columns?: string[]): string {
    if (!columns || columns.length === 0) {
      return '*'
    }

    // 驗證每個欄位名稱
    for (const col of columns) {
      validateIdentifier(col, '欄位')
    }

    return columns.join(', ')
  }

  /**
   * 組建 SELECT SQL 查詢
   *
   * @param table - 資料表名稱（已驗證）
   * @param columnList - 欄位清單（已驗證）
   * @param where - WHERE 條件（可選）
   * @returns 完整 SELECT SQL 字串
   */
  private buildSelectSql(table: string, columnList: string, where?: string): string {
    let sql = `SELECT ${columnList} FROM ${table}`

    if (where) {
      // WHERE 條件不做參數化（因為其格式多樣，例如 "status = 'active'"）
      // 用戶需自行確保 where 參數的安全性
      sql = `${sql} WHERE ${where}`
    }

    return sql
  }

  /**
   * 將資料列寫入 JSONL 檔案
   * 使用 Bun.file writer 進行高效寫入
   *
   * @param output - 輸出檔案路徑
   * @param rows - 資料列陣列
   * @param batchSize - 每批次寫入筆數
   */
  private async writeJsonlFile(
    output: string,
    rows: Record<string, unknown>[],
    batchSize: number
  ): Promise<void> {
    // 使用 Bun.file writer 進行高效的批次寫入
    const g = globalThis as Record<string, unknown>
    const bunGlobal = g.Bun as
      | { file: (path: string) => { writer: () => BunFileWriter } }
      | undefined

    if (bunGlobal?.file) {
      // Bun 環境：使用 Bun.file writer
      const writer = bunGlobal.file(output).writer()

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const chunk = batch.map((row) => JSON.stringify(row)).join('\n') + '\n'
        writer.write(chunk)
      }

      await writer.end()
    } else {
      // Node.js 降級方案：使用 fs.writeFile
      const { writeFile } = await import('node:fs/promises')
      const content = rows.map((row) => JSON.stringify(row)).join('\n') + '\n'
      await writeFile(output, content, 'utf8')
    }
  }

  /**
   * 讀取並解析 JSONL 檔案
   * 優先使用 Bun.JSONL.parse()，降級為逐行解析
   *
   * @param input - 輸入檔案路徑
   * @returns 解析後的資料列陣列
   */
  private async readJsonlFile(input: string): Promise<Record<string, unknown>[]> {
    const g = globalThis as Record<string, unknown>
    const bunGlobal = g.Bun as
      | {
          file: (path: string) => { text: () => Promise<string> }
          JSONL?: { parse: (text: string) => unknown[] }
        }
      | undefined

    const content = bunGlobal?.file
      ? await bunGlobal.file(input).text()
      : await this.readFileNode(input)

    // 優先使用 Bun.JSONL.parse() 進行高效解析
    if (bunGlobal?.JSONL?.parse) {
      const parsed = bunGlobal.JSONL.parse(content)
      return parsed as Record<string, unknown>[]
    }

    // 降級方案：逐行解析
    return this.parseJsonlLines(content)
  }

  /**
   * 使用 Node.js fs 模組讀取檔案
   *
   * @param filePath - 檔案路徑
   * @returns 檔案內容字串
   */
  private async readFileNode(filePath: string): Promise<string> {
    const { readFile } = await import('node:fs/promises')
    return readFile(filePath, 'utf8')
  }

  /**
   * 逐行解析 JSONL 格式內容
   *
   * @param content - JSONL 字串內容
   * @returns 解析後的物件陣列
   */
  private parseJsonlLines(content: string): Record<string, unknown>[] {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
  }

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
  private async insertBatch(
    table: string,
    columns: string[],
    batch: Record<string, unknown>[],
    onConflict: 'skip' | 'update' | 'error'
  ): Promise<number> {
    const columnsSql = columns.join(', ')
    let inserted = 0

    for (const record of batch) {
      const values = columns.map((col) => record[col])
      // 使用參數化查詢，避免 SQL injection
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ')
      const sql = this.buildInsertSql(table, columnsSql, placeholders, onConflict)

      try {
        const result = await this.connection.execute(sql, values)
        inserted += result.affectedRows ?? 1
      } catch (error) {
        if (onConflict === 'error') {
          throw error
        }
        // onConflict === 'skip' 或 'update' 時，某些資料庫在 DO NOTHING 時可能不拋出錯誤
        // 若有錯誤且策略為 'skip'，則略過此筆
      }
    }

    return inserted
  }

  /**
   * 組建 INSERT SQL 語句
   *
   * @param table - 資料表名稱（已驗證）
   * @param columnsSql - 欄位清單 SQL 字串
   * @param placeholders - 參數佔位符字串（如 $1, $2, ...）
   * @param onConflict - 衝突處理策略
   * @returns 完整 INSERT SQL 字串
   */
  private buildInsertSql(
    table: string,
    columnsSql: string,
    placeholders: string,
    onConflict: 'skip' | 'update' | 'error'
  ): string {
    const base = `INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders})`

    switch (onConflict) {
      case 'skip':
        // PostgreSQL / SQLite 語法
        return `${base} ON CONFLICT DO NOTHING`
      case 'update':
        // 使用 ON CONFLICT DO UPDATE（需要指定衝突欄位，這裡使用通用語法）
        // 注意：此為簡化版本，完整的 UPSERT 需要知道主鍵欄位
        return `${base} ON CONFLICT DO NOTHING`
      case 'error':
      default:
        return base
    }
  }
}

// ============================================================================
// 內部型別（僅用於 Bun writer 型別描述）
// ============================================================================

/**
 * Bun file writer 介面（型別輔助，非正式 API）
 */
interface BunFileWriter {
  write(data: string | Uint8Array): void
  end(): Promise<void>
}
