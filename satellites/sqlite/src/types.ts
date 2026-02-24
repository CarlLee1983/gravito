/**
 * SQLite Satellite Types
 */

export interface SQLiteConnection {
  /**
   * Database file path
   */
  dbPath: string

  /**
   * Execute SQL query
   */
  execute(sql: string, params?: any[]): Promise<any[]>

  /**
   * Execute single statement without result
   */
  run(sql: string, params?: any[]): Promise<void>

  /**
   * Get single row
   */
  getOne(sql: string, params?: any[]): Promise<any | null>

  /**
   * Close connection
   */
  close(): Promise<void>

  /**
   * Check if connection is open
   */
  isOpen(): boolean
}

export interface SQLiteConfig {
  /**
   * Database file path
   */
  dbPath: string

  /**
   * Enable foreign keys (default: true)
   */
  foreignKeys?: boolean

  /**
   * Journal mode (default: 'WAL')
   */
  journalMode?: 'DELETE' | 'WAL' | 'TRUNCATE'

  /**
   * Timeout in milliseconds (default: 5000)
   */
  timeout?: number
}

export interface SQLiteServiceConfig {
  /**
   * SQLite database path
   */
  dbPath: string

  /**
   * LibSQLite3 library path (default: system)
   */
  libPath?: string

  /**
   * Additional Xenon config
   */
  xenonConfig?: {
    allowedPaths?: string[]
    blockedPaths?: string[]
  }
}
