/**
 * Schema Registry
 * @description Central registry for table schemas with JIT sniffing and AOT locking
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { SchemaSniffer } from './SchemaSniffer'
import type {
  ColumnSchema,
  SchemaLock,
  SerializedColumnSchema,
  SerializedTableSchema,
  TableSchema,
} from './types'

/**
 * Schema Registry Mode
 */
export type SchemaMode = 'jit' | 'aot'

/**
 * Schema Registry Options
 */
export interface SchemaRegistryOptions {
  /** Mode: jit (dev) or aot (prod) */
  mode?: SchemaMode
  /** Path to schema lock file */
  lockPath?: string
  /** Database connection name */
  connection?: string
  /** Cache TTL in milliseconds (JIT mode) */
  cacheTtl?: number
}

/**
 * Schema Registry
 * Central registry for table schemas
 *
 * @example
 * ```typescript
 * // Dev mode: JIT sniffing
 * const registry = SchemaRegistry.getInstance({ mode: 'jit' })
 * const schema = await registry.get('users')
 *
 * // Prod mode: AOT from lock file
 * SchemaRegistry.init({ mode: 'aot', lockPath: '.schema-lock.json' })
 * const schema = await registry.get('users')
 * ```
 */
export class SchemaRegistry {
  private static instance: SchemaRegistry | null = null

  private cache: Map<string, TableSchema> = new Map()
  private sniffer: SchemaSniffer
  private mode: SchemaMode
  private lockPath: string
  private cacheTtl: number
  private _initialized = false

  private constructor(options: SchemaRegistryOptions = {}) {
    this.mode = options.mode ?? (process.env.NODE_ENV === 'production' ? 'aot' : 'jit')
    this.lockPath = options.lockPath ?? '.schema-lock.json'
    this.cacheTtl = options.cacheTtl ?? 60000 // 1 minute default
    this.sniffer = new SchemaSniffer(options.connection)
  }

  /**
   * Check if registry is initialized
   */
  get isInitialized(): boolean {
    return this._initialized
  }

  // ============================================================================
  // Singleton Management
  // ============================================================================

  /**
   * Initialize the registry (call once at startup)
   */
  static init(options: SchemaRegistryOptions = {}): SchemaRegistry {
    SchemaRegistry.instance = new SchemaRegistry(options)

    // AOT Mode: Load from lock file immediately
    if (SchemaRegistry.instance.mode === 'aot') {
      SchemaRegistry.instance.loadFromLock()
    }

    SchemaRegistry.instance._initialized = true
    return SchemaRegistry.instance
  }

  /**
   * Get the registry instance
   */
  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      // Auto-init with defaults if not initialized
      return SchemaRegistry.init()
    }
    return SchemaRegistry.instance
  }

  /**
   * Reset the registry (for testing)
   */
  static reset(): void {
    SchemaRegistry.instance = null
  }

  // ============================================================================
  // Schema Access
  // ============================================================================

  /**
   * Get schema for a table
   */
  async get(table: string): Promise<TableSchema> {
    // Check cache first
    const cached = this.cache.get(table)
    if (cached) {
      // Check TTL in JIT mode
      if (this.mode === 'aot' || Date.now() - cached.capturedAt < this.cacheTtl) {
        return cached
      }
    }

    // JIT Mode: Sniff from database
    if (this.mode === 'jit') {
      const schema = await this.sniffer.sniff(table)
      this.cache.set(table, schema)
      return schema
    }

    // AOT Mode: Must be in cache
    throw new Error(
      `Table "${table}" not found in schema lock. Run 'bun db:schema:lock' to regenerate.`
    )
  }

  /**
   * Check if table schema exists
   */
  has(table: string): boolean {
    return this.cache.has(table)
  }

  /**
   * Get column schema
   */
  async getColumn(table: string, column: string): Promise<ColumnSchema | undefined> {
    const schema = await this.get(table)
    return schema.columns.get(column)
  }

  /**
   * Check if column exists
   */
  async hasColumn(table: string, column: string): Promise<boolean> {
    const schema = await this.get(table)
    return schema.columns.has(column)
  }

  /**
   * Get all cached tables
   */
  getTables(): string[] {
    return Array.from(this.cache.keys())
  }

  // ============================================================================
  // Self-Healing
  // ============================================================================

  /**
   * Invalidate cache for a specific table
   * Forces re-sniff on next access
   */
  invalidate(table: string): void {
    this.cache.delete(table)
  }

  /**
   * Invalidate all cached schemas
   */
  invalidateAll(): void {
    this.cache.clear()
  }

  /**
   * Force refresh schema for a table
   * Re-sniffs even if cached (JIT mode only)
   */
  async refresh(table: string): Promise<TableSchema> {
    if (this.mode === 'aot') {
      throw new Error('Cannot refresh schema in AOT mode. Use JIT mode for development.')
    }

    this.cache.delete(table)
    const schema = await this.sniffer.sniff(table)
    this.cache.set(table, schema)
    return schema
  }

  /**
   * Wrap a database operation with self-healing
   * Automatically re-sniffs schema on column-related errors and retries
   *
   * @example
   * ```typescript
   * const result = await registry.withSelfHealing('users', async () => {
   *   return await connection.table('users').where('new_column', value).get()
   * })
   * ```
   */
  async withSelfHealing<T>(table: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // Check if error is schema-related
      if (this.isSchemaError(error)) {
        console.warn(
          `[SchemaRegistry] Schema error detected for "${table}", attempting self-heal...`
        )

        // Invalidate and retry (JIT mode only)
        if (this.mode === 'jit') {
          await this.refresh(table)
          console.info(`[SchemaRegistry] Schema refreshed for "${table}", retrying operation...`)
          return await operation()
        }
      }
      throw error
    }
  }

  /**
   * Check if an error is schema-related
   */
  private isSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const schemaErrorPatterns = [
      /column.*not found/i,
      /column.*does not exist/i,
      /unknown column/i,
      /no such column/i,
      /undefined column/i,
      /relation.*does not exist/i,
      /table.*doesn't exist/i,
    ]

    return schemaErrorPatterns.some((pattern) => pattern.test(error.message))
  }

  // ============================================================================
  // Lock File Management
  // ============================================================================

  /**
   * Load schemas from lock file (AOT mode)
   */
  loadFromLock(path?: string): void {
    const lockPath = path ?? this.lockPath

    if (!existsSync(lockPath)) {
      throw new Error(
        `Schema lock file not found: ${lockPath}. Run 'bun db:schema:lock' to generate.`
      )
    }

    const content = readFileSync(lockPath, 'utf-8')
    const lock: SchemaLock = JSON.parse(content)

    for (const [tableName, serialized] of Object.entries(lock.tables)) {
      const schema = this.deserializeTableSchema(serialized)
      this.cache.set(tableName, schema)
    }
  }

  /**
   * Save schemas to lock file
   */
  async saveToLock(tables: string[], path?: string): Promise<void> {
    const lockPath = path ?? this.lockPath
    const lock: SchemaLock = {
      version: '1.0',
      driver: 'auto',
      generatedAt: new Date().toISOString(),
      tables: {},
    }

    for (const table of tables) {
      const schema = await this.sniffer.sniff(table)
      this.cache.set(table, schema)
      lock.tables[table] = this.serializeTableSchema(schema)
    }

    writeFileSync(lockPath, JSON.stringify(lock, null, 2))
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  private serializeTableSchema(schema: TableSchema): SerializedTableSchema {
    const columns: SerializedColumnSchema[] = []

    for (const col of schema.columns.values()) {
      columns.push({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        default: col.default,
        primary: col.primary,
        unique: col.unique,
        autoIncrement: col.autoIncrement,
        enumValues: col.enumValues,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale,
      })
    }

    return {
      table: schema.table,
      columns,
      primaryKey: schema.primaryKey,
    }
  }

  private deserializeTableSchema(serialized: SerializedTableSchema): TableSchema {
    const columns = new Map<string, ColumnSchema>()

    for (const col of serialized.columns) {
      columns.set(col.name, {
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        default: col.default,
        primary: col.primary,
        unique: col.unique,
        autoIncrement: col.autoIncrement,
        enumValues: col.enumValues,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale,
      })
    }

    return {
      table: serialized.table,
      columns,
      primaryKey: serialized.primaryKey,
      capturedAt: Date.now(),
    }
  }
}
