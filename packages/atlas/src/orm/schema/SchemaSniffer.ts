/**
 * Schema Sniffer
 * @description Introspects database schema at runtime (JIT mode)
 */

import { DB } from '../../DB'
import type { ColumnSchema, ColumnType, TableSchema } from './types'

/**
 * Schema Sniffer
 * Retrieves table schema from database at runtime
 */
export class SchemaSniffer {
  private connectionName: string | undefined

  constructor(connectionName?: string) {
    this.connectionName = connectionName
  }

  /**
   * Sniff table schema from database
   */
  async sniff(table: string): Promise<TableSchema> {
    const driver = this.getDriverName()

    switch (driver) {
      case 'postgres':
      case 'postgresql':
        return await this.sniffPostgres(table)
      case 'mysql':
      case 'mariadb':
        return await this.sniffMySQL(table)
      case 'sqlite':
        return await this.sniffSQLite(table)
      default:
        throw new Error(`Unsupported driver for schema sniffing: ${driver}`)
    }
  }

  /**
   * Sniff SQLite table schema
   */
  private async sniffSQLite(table: string): Promise<TableSchema> {
    const connection = DB.connection(this.connectionName)

    // Get columns
    const columnsResult = await connection.raw(`PRAGMA table_info('${table}')`)

    const columns = new Map<string, ColumnSchema>()
    const primaryKey: string[] = []

    for (const row of columnsResult.rows as any[]) {
      const column: ColumnSchema = {
        name: row.name,
        type: this.mapSQLiteType(row.type),
        nullable: row.notnull === 0,
        default: row.dflt_value,
        primary: row.pk > 0,
        unique: false, // Check indexes below
        autoIncrement: false,
      }

      // SQLite INTEGER PRIMARY KEY is auto-increment alias for ROWID
      if (column.primary && column.type === 'integer') {
        column.autoIncrement = true
      }

      columns.set(column.name, column)

      if (column.primary) {
        primaryKey.push(column.name)
      }
    }

    // Check indexes for UNIQUE
    try {
        const indexesResult = await connection.raw(`PRAGMA index_list('${table}')`)
        for (const idx of indexesResult.rows as any[]) {
            if (idx.unique === 1 && idx.origin === 'u') {
                const info = await connection.raw(`PRAGMA index_info('${idx.name}')`)
                if (info.rows.length === 1) {
                    const colName = (info.rows[0] as any).name
                    const col = columns.get(colName)
                    if (col) col.unique = true
                }
            }
        }
    } catch {
        // Ignore index errors
    }

    return {
      table,
      columns,
      primaryKey,
      capturedAt: Date.now(),
    }
  }

  /**
   * Sniff PostgreSQL table schema
   */
  private async sniffPostgres(table: string): Promise<TableSchema> {
    const connection = DB.connection(this.connectionName)

    // Get columns
    const columnsResult = await connection.raw(
      `
            SELECT 
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                c.udt_name,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
                CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as is_unique
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'
            ) u ON c.column_name = u.column_name
            WHERE c.table_name = $1
            ORDER BY c.ordinal_position
        `,
      [table]
    )

    const columns = new Map<string, ColumnSchema>()
    const primaryKey: string[] = []

    for (const row of columnsResult.rows as Record<string, unknown>[]) {
      const column: ColumnSchema = {
        name: row.column_name as string,
        type: this.mapPostgresType(row.data_type as string, row.udt_name as string),
        nullable: row.is_nullable === 'YES',
        default: this.parseDefault(row.column_default as string | null),
        primary: row.is_primary as boolean,
        unique: row.is_unique as boolean,
        autoIncrement: (row.column_default as string)?.includes('nextval') ?? false,
        maxLength: row.character_maximum_length as number | undefined,
        precision: row.numeric_precision as number | undefined,
        scale: row.numeric_scale as number | undefined,
      }

      columns.set(column.name, column)

      if (column.primary) {
        primaryKey.push(column.name)
      }
    }

    return {
      table,
      columns,
      primaryKey,
      capturedAt: Date.now(),
    }
  }

  /**
   * Sniff MySQL table schema
   */
  private async sniffMySQL(table: string): Promise<TableSchema> {
    const connection = DB.connection(this.connectionName)

    const columnsResult = await connection.raw(`SHOW COLUMNS FROM \`${table}\``)

    const columns = new Map<string, ColumnSchema>()
    const primaryKey: string[] = []

    for (const row of columnsResult.rows as Record<string, unknown>[]) {
      const typeStr = row.Type as string
      const column: ColumnSchema = {
        name: row.Field as string,
        type: this.mapMySQLType(typeStr),
        nullable: row.Null === 'YES',
        default: row.Default,
        primary: row.Key === 'PRI',
        unique: row.Key === 'UNI',
        autoIncrement: (row.Extra as string)?.includes('auto_increment') ?? false,
        maxLength: this.extractMySQLLength(typeStr),
        enumValues: this.extractMySQLEnumValues(typeStr),
      }

      columns.set(column.name, column)

      if (column.primary) {
        primaryKey.push(column.name)
      }
    }

    return {
      table,
      columns,
      primaryKey,
      capturedAt: Date.now(),
    }
  }

  /**
   * Map PostgreSQL type to ColumnType
   */
  private mapPostgresType(dataType: string, udtName: string): ColumnType {
    const typeMap: Record<string, ColumnType> = {
      'character varying': 'string',
      varchar: 'string',
      character: 'string',
      char: 'string',
      text: 'text',
      integer: 'integer',
      int: 'integer',
      int4: 'integer',
      smallint: 'smallint',
      int2: 'smallint',
      bigint: 'bigint',
      int8: 'bigint',
      numeric: 'decimal',
      decimal: 'decimal',
      real: 'float',
      float4: 'float',
      'double precision': 'float',
      float8: 'float',
      boolean: 'boolean',
      bool: 'boolean',
      date: 'date',
      time: 'time',
      timestamp: 'timestamp',
      'timestamp without time zone': 'timestamp',
      'timestamp with time zone': 'timestamp',
      json: 'json',
      jsonb: 'jsonb',
      uuid: 'uuid',
      bytea: 'binary',
    }

    if (udtName?.startsWith('_')) {
      return 'json' // Array types
    }

    return typeMap[dataType.toLowerCase()] ?? 'unknown'
  }

  /**
   * Map MySQL type to ColumnType
   */
  private mapMySQLType(typeStr: string): ColumnType {
    const base = typeStr?.toLowerCase().split('(')[0]?.trim() ?? ''

    const typeMap: Record<string, ColumnType> = {
      varchar: 'string',
      char: 'string',
      text: 'text',
      tinytext: 'text',
      mediumtext: 'text',
      longtext: 'text',
      int: 'integer',
      tinyint: 'integer',
      smallint: 'smallint',
      mediumint: 'integer',
      bigint: 'bigint',
      decimal: 'decimal',
      numeric: 'decimal',
      float: 'float',
      double: 'float',
      boolean: 'boolean',
      bool: 'boolean',
      date: 'date',
      time: 'time',
      datetime: 'datetime',
      timestamp: 'timestamp',
      json: 'json',
      binary: 'binary',
      varbinary: 'binary',
      blob: 'binary',
      enum: 'enum',
    }

    // Check for tinyint(1) as boolean
    if (base === 'tinyint' && typeStr.includes('(1)')) {
      return 'boolean'
    }

    return typeMap[base] ?? 'unknown'
  }

  private mapSQLiteType(type: string): ColumnType {
    const t = type.toLowerCase()
    if (t.includes('int')) return 'integer'
    if (t.includes('char') || t.includes('clob') || t.includes('text')) return 'string'
    if (t.includes('blob')) return 'binary'
    if (t.includes('real') || t.includes('floa') || t.includes('doub')) return 'float'
    if (t.includes('date') || t.includes('time')) return 'timestamp'
    return 'string'
  }

  /**
   * Parse default value
   */
  private parseDefault(value: string | null): unknown {
    if (value === null || value === 'NULL') {
      return undefined
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1)
    }
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
    if (!Number.isNaN(Number(value))) {
      return Number(value)
    }
    return undefined
  }

  /**
   * Extract length from MySQL type
   */
  private extractMySQLLength(typeStr: string): number | undefined {
    const match = typeStr.match(/\((\d+)\)/)
    return match?.[1] ? parseInt(match[1], 10) : undefined
  }

  /**
   * Extract enum values from MySQL type
   */
  private extractMySQLEnumValues(typeStr: string): string[] | undefined {
    if (!typeStr.toLowerCase().startsWith('enum')) {
      return undefined
    }
    const match = typeStr.match(/\((.+)\)/)
    if (!match?.[1]) {
      return undefined
    }
    return match[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
  }

  /**
   * Get driver name
   */
  private getDriverName(): string {
    const config = DB.getConnectionConfig(this.connectionName)
    return config?.driver ?? 'postgres'
  }
}
