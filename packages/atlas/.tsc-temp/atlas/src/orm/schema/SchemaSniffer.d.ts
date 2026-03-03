/**
 * Schema Sniffer
 * @description Introspects database schema at runtime (JIT mode)
 */
import type { TableSchema } from './types'
/**
 * Schema Sniffer
 * Retrieves table schema from database at runtime
 */
export declare class SchemaSniffer {
  private connectionName
  constructor(connectionName?: string)
  /**
   * Sniff table schema from database
   */
  sniff(table: string): Promise<TableSchema>
  /**
   * Sniff SQLite table schema
   */
  private sniffSQLite
  /**
   * Sniff PostgreSQL table schema
   */
  private sniffPostgres
  /**
   * Sniff MySQL table schema
   */
  private sniffMySQL
  /**
   * Map PostgreSQL type to ColumnType
   */
  private mapPostgresType
  /**
   * Map MySQL type to ColumnType
   */
  private mapMySQLType
  private mapSQLiteType
  /**
   * Parse default value
   */
  private parseDefault
  /**
   * Extract length from MySQL type
   */
  private extractMySQLLength
  /**
   * Extract enum values from MySQL type
   */
  private extractMySQLEnumValues
  /**
   * Get driver name
   */
  private getDriverName
}
