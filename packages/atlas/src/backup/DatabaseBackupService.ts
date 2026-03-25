/**
 * @fileoverview DatabaseBackupService - 資料庫備份與還原服務
 *
 * 利用 RuntimeArchiveAdapter（tar.gz）與 RuntimeAdapter（非同步 I/O）
 * 實現完整的資料庫備份、還原及 Schema 匯出為 Migration 檔案的功能。
 */

import { mkdir } from 'node:fs/promises'
import type { RuntimeArchiveAdapter } from '@gravito/core'
import { getArchiveAdapter, getRuntimeAdapter } from '@gravito/core'
import { DB } from '../DB'
import { Schema } from '../schema'
import type { ConnectionContract, DriverType } from '../types'

// ============ 公開介面 ============

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
 * 備份 Manifest 描述結構
 * @internal
 */
interface BackupManifest {
  readonly version: string
  readonly createdAt: string
  readonly driver: DriverType
  readonly tables: readonly string[]
  readonly rowCounts: Record<string, number>
}

// ============ 服務主體 ============

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
export class DatabaseBackupService {
  private readonly archive: RuntimeArchiveAdapter
  private readonly runtime: ReturnType<typeof getRuntimeAdapter>

  constructor(
    private readonly connectionName?: string,
    archive?: RuntimeArchiveAdapter,
    runtime?: ReturnType<typeof getRuntimeAdapter>
  ) {
    this.archive = archive ?? getArchiveAdapter()
    this.runtime = runtime ?? getRuntimeAdapter()
  }

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
  async backup(outputPath: string, options: BackupOptions = {}): Promise<BackupResult> {
    const connection = DB.connection(this.connectionName)
    const driverType = this.getDriverType(connection)
    const allTables = options.tables ?? (await this.discoverTables())

    const entries: Record<string, string | Blob | ArrayBuffer | Uint8Array> = {}
    const rowCounts: Record<string, number> = {}
    let totalRowCount = 0

    // 匯出每個表的資料
    for (const table of allTables) {
      const rows = await this.exportTableData(connection, table)
      rowCounts[table] = rows.length
      totalRowCount += rows.length

      // 每行一個 JSON，JSONL 格式
      const jsonl = rows.map((row) => JSON.stringify(row)).join('\n')
      entries[`data/${table}.jsonl`] = jsonl
    }

    // 建立 manifest
    const manifest: BackupManifest = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      driver: driverType,
      tables: allTables,
      rowCounts,
    }
    entries['backup_manifest.json'] = JSON.stringify(manifest, null, 2)

    // 如需 schema 資訊（sqlite 以外的資料庫）
    if (options.includeSchema !== false) {
      const schemaInfo = await this.buildSchemaInfo(allTables)
      entries['schema.json'] = JSON.stringify(schemaInfo, null, 2)
    }

    // 打包為 tar.gz
    const archiveData = await this.archive.create(entries, {
      compress: 'gzip',
      level: options.compressionLevel ?? 6,
    })

    // 寫入到指定路徑
    await this.runtime.writeFile(outputPath, archiveData)

    return {
      outputPath,
      tableCount: allTables.length,
      rowCount: totalRowCount,
      createdAt: manifest.createdAt,
      tables: allTables,
    }
  }

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
  async restore(backupPath: string, options: RestoreOptions = {}): Promise<void> {
    // 讀取歸檔
    let archiveData: Uint8Array
    try {
      archiveData = await this.runtime.readFile(backupPath)
    } catch {
      throw new Error(`[DatabaseBackupService] 備份檔案不存在或無法讀取：${backupPath}`)
    }

    // 讀取 manifest
    const manifestRaw = await this.archive.readFile(archiveData, 'backup_manifest.json')
    if (!manifestRaw) {
      throw new Error('[DatabaseBackupService] 備份檔案格式無效：缺少 backup_manifest.json')
    }
    const manifestText = new TextDecoder().decode(manifestRaw)
    const manifest: BackupManifest = JSON.parse(manifestText)

    // 決定要還原的表
    const tablesToRestore = options.tables
      ? manifest.tables.filter((t) => options.tables?.includes(t))
      : manifest.tables

    const connection = DB.connection(this.connectionName)

    // 使用交易保持資料一致性
    if (options.useTransaction !== false) {
      await connection.transaction(async (trx) => {
        await this.restoreTables(archiveData, tablesToRestore, trx, options)
      })
    } else {
      await this.restoreTables(archiveData, tablesToRestore, connection, options)
    }
  }

  /**
   * 匯出資料庫 Schema 為 TypeScript Migration 檔案
   *
   * @param migrationName - Migration 名稱（用於產生檔名）
   * @param outputDir - 輸出目錄（預設 ./migrations）
   * @returns 產生的 Migration 檔案路徑
   */
  async exportSchemaAsMigration(
    migrationName: string,
    outputDir = './migrations'
  ): Promise<string> {
    const tables = await this.discoverTables()
    const connection = DB.connection(this.connectionName)
    const driverType = this.getDriverType(connection)

    const content = this.generateMigrationContent(tables, driverType, migrationName)

    // 確保輸出目錄存在
    await mkdir(outputDir, { recursive: true })

    // 產生帶時間戳的檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${timestamp}_${migrationName}.ts`
    const filePath = `${outputDir}/${filename}`

    await this.runtime.writeFile(filePath, content)
    return filePath
  }

  // ============ 私有輔助方法 ============

  /**
   * 探索資料庫中所有可用的表
   * @internal
   */
  private async discoverTables(): Promise<string[]> {
    try {
      const tables = await Schema.connection(this.connectionName ?? 'default').getTables()
      return tables.filter((t) => t && t.length > 0)
    } catch {
      // 若 Schema.getTables 不支援，嘗試原始查詢
      const connection = DB.connection(this.connectionName)
      const driverType = this.getDriverType(connection)
      const sql = this.buildListTablesSQL(driverType)
      const result = await connection.raw(sql)
      return (result.rows as Record<string, unknown>[]).map(
        (row) => (row.table_name ?? row.TABLE_NAME ?? row.name ?? '') as string
      )
    }
  }

  /**
   * 匯出單一表的所有資料
   * @internal
   */
  private async exportTableData(
    connection: ConnectionContract,
    table: string
  ): Promise<Record<string, unknown>[]> {
    try {
      const result = await connection.table(table).get()
      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }

  /**
   * 還原多個表的資料
   * @internal
   */
  private async restoreTables(
    archiveData: Uint8Array,
    tables: readonly string[],
    connection: ConnectionContract,
    options: RestoreOptions
  ): Promise<void> {
    for (const table of tables) {
      // 若需要先清空
      if (options.truncate) {
        await connection.table(table).delete()
      }

      // 讀取對應的 JSONL 資料
      const jsonlRaw = await this.archive.readFile(archiveData, `data/${table}.jsonl`)
      if (!jsonlRaw) {
        continue
      }

      const jsonlText = new TextDecoder().decode(jsonlRaw)
      const rows = jsonlText
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>)

      if (rows.length > 0) {
        // 批量插入（每批 500 筆）
        const batchSize = 500
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize)
          await connection.table(table).insert(batch)
        }
      }
    }
  }

  /**
   * 取得連線的驅動類型
   * @internal
   */
  private getDriverType(connection: ConnectionContract): DriverType {
    const config = (connection as unknown as { config: { driver: DriverType } }).config
    return (config?.driver ?? 'sqlite') as DriverType
  }

  /**
   * 依驅動類型建構列出所有表的 SQL
   * @internal
   */
  private buildListTablesSQL(driver: DriverType): string {
    switch (driver) {
      case 'postgres':
        return `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
      case 'mysql':
      case 'mariadb':
        return 'SELECT table_name FROM information_schema.tables WHERE table_type = "BASE TABLE"'
      case 'sqlite':
        return `SELECT name AS table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      default:
        return `SELECT name AS table_name FROM sqlite_master WHERE type='table'`
    }
  }

  /**
   * 取得各表的基本 Schema 資訊
   * @internal
   */
  private async buildSchemaInfo(tables: readonly string[]): Promise<Record<string, unknown>> {
    const info: Record<string, unknown> = {}
    for (const table of tables) {
      try {
        const exists = await Schema.hasTable(table)
        info[table] = { exists }
      } catch {
        info[table] = { exists: false }
      }
    }
    return info
  }

  /**
   * 產生 Migration TypeScript 原始碼
   * @internal
   */
  private generateMigrationContent(
    tables: readonly string[],
    driver: DriverType,
    migrationName: string
  ): string {
    const tableStatements = tables
      .map(
        (table) => `
    // 表：${table}
    schema.create('${table}', (t) => {
      t.id()
      t.timestamps()
    })`
      )
      .join('\n')

    return `/**
 * Migration: ${migrationName}
 * 驅動類型: ${driver}
 * 產生時間: ${new Date().toISOString()}
 *
 * 此 Migration 由 DatabaseBackupService.exportSchemaAsMigration() 自動產生。
 * 請依實際欄位定義調整以下內容。
 */

import type { Schema } from '@gravito/atlas'

export async function up(schema: Schema): Promise<void> {
${tableStatements}
}

export async function down(schema: Schema): Promise<void> {
${tables.map((table) => `  await schema.drop('${table}')`).join('\n')}
}
`
  }
}
