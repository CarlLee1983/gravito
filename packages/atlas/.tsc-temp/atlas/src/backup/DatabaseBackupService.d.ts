/**
 * @fileoverview DatabaseBackupService - 資料庫備份與還原服務
 *
 * 利用 RuntimeArchiveAdapter（tar.gz）與 RuntimeAdapter（非同步 I/O）
 * 實現完整的資料庫備份、還原及 Schema 匯出為 Migration 檔案的功能。
 */
/**
 * 備份選項
 * @public
 */
export interface BackupOptions {
  /** 指定要備份的表（若未指定則備份全部） */
  readonly tables?: readonly string[]
  /** 是否包含 schema 資訊（預設 true） */
  readonly includeSchema?: boolean
  /** 壓縮等級（1-12，預設 6） */
  readonly compressionLevel?: number
}
/**
 * 備份結果
 * @public
 */
export interface BackupResult {
  /** 輸出路徑 */
  readonly outputPath: string
  /** 備份的表數量 */
  readonly tableCount: number
  /** 備份的總記錄數 */
  readonly rowCount: number
  /** 備份建立時間 */
  readonly createdAt: string
  /** 備份的表清單 */
  readonly tables: readonly string[]
}
/**
 * 還原選項
 * @public
 */
export interface RestoreOptions {
  /** 指定要還原的表（若未指定則還原全部） */
  readonly tables?: readonly string[]
  /** 還原前是否清空既有資料（預設 false） */
  readonly truncate?: boolean
  /** 是否使用交易（預設 true） */
  readonly useTransaction?: boolean
}
/**
 * DatabaseBackupService - 資料庫備份與還原服務
 *
 * 提供完整的備份、還原與 Schema 匯出功能，支援所有 Atlas 資料庫驅動。
 *
 * @example
 * ```typescript
 * const backup = new DatabaseBackupService()
 *
 * // 備份資料庫
 * const result = await backup.backup('./backups/db-backup.tar.gz')
 *
 * // 還原資料庫
 * await backup.restore('./backups/db-backup.tar.gz')
 *
 * // 匯出 Schema 為 Migration
 * const filePath = await backup.exportSchemaAsMigration('initial')
 * ```
 *
 * @public
 */
export declare class DatabaseBackupService {
  private readonly connectionName?
  private readonly archive
  private readonly runtime
  constructor(connectionName?: string)
  /**
   * 備份資料庫（Schema + 資料）為 tar.gz 歸檔
   *
   * 流程：
   * 1. 探索所有表（discoverTables）
   * 2. 匯出每個表的資料為 JSONL
   * 3. 建立 backup_manifest.json
   * 4. 打包為 tar.gz
   *
   * @param outputPath - 輸出的 tar.gz 路徑
   * @param options - 備份選項
   * @returns 備份結果摘要
   */
  backup(outputPath: string, options?: BackupOptions): Promise<BackupResult>
  /**
   * 從備份 tar.gz 還原資料庫
   *
   * 流程：
   * 1. 讀取歸檔二進位資料
   * 2. 解析 backup_manifest.json
   * 3. 依序還原各表資料（支援交易）
   *
   * @param backupPath - 備份 tar.gz 檔案路徑
   * @param options - 還原選項
   */
  restore(backupPath: string, options?: RestoreOptions): Promise<void>
  /**
   * 匯出資料庫 Schema 為 TypeScript Migration 檔案
   *
   * @param migrationName - Migration 名稱（用於產生檔名）
   * @param outputDir - 輸出目錄（預設 ./migrations）
   * @returns 產生的 Migration 檔案路徑
   */
  exportSchemaAsMigration(migrationName: string, outputDir?: string): Promise<string>
  /**
   * 探索資料庫中所有可用的表
   * @internal
   */
  private discoverTables
  /**
   * 匯出單一表的所有資料
   * @internal
   */
  private exportTableData
  /**
   * 還原多個表的資料
   * @internal
   */
  private restoreTables
  /**
   * 取得連線的驅動類型
   * @internal
   */
  private getDriverType
  /**
   * 依驅動類型建構列出所有表的 SQL
   * @internal
   */
  private buildListTablesSQL
  /**
   * 取得各表的基本 Schema 資訊
   * @internal
   */
  private buildSchemaInfo
  /**
   * 產生 Migration TypeScript 原始碼
   * @internal
   */
  private generateMigrationContent
}
