/**
 * Schema Registry
 * @description Central registry for table schemas with JIT sniffing and AOT locking
 */
import type { ColumnSchema, TableSchema } from './types'
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
export declare class SchemaRegistry {
  private static instance
  private cache
  private pendingSniffs
  private sniffer
  private mode
  private lockPath
  private cacheTtl
  private _initialized
  private constructor()
  /**
   * Check if registry is initialized
   */
  get isInitialized(): boolean
  /**
   * Initialize the registry (call once at startup)
   */
  static init(options?: SchemaRegistryOptions): SchemaRegistry
  /**
   * Get the registry instance
   */
  static getInstance(): SchemaRegistry
  /**
   * Reset the registry (for testing)
   */
  static reset(): void
  /**
   * Get schema for a table
   */
  get(table: string, connection?: string): Promise<TableSchema>
  /**
   * Check if table schema exists
   */
  has(table: string): boolean
  /**
   * Get column schema
   */
  getColumn(table: string, column: string): Promise<ColumnSchema | undefined>
  /**
   * Check if column exists
   */
  hasColumn(table: string, column: string): Promise<boolean>
  /**
   * Get all cached tables
   */
  getTables(): string[]
  /**
   * Invalidate cache for a specific table
   * Forces re-sniff on next access
   */
  invalidate(table: string): void
  /**
   * Invalidate all cached schemas
   */
  invalidateAll(): void
  /**
   * Force refresh schema for a table
   * Re-sniffs even if cached (JIT mode only)
   */
  refresh(table: string): Promise<TableSchema>
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
  withSelfHealing<T>(table: string, operation: () => Promise<T>): Promise<T>
  /**
   * Check if an error is schema-related
   */
  private isSchemaError
  /**
   * Load schemas from lock file (AOT mode)
   */
  loadFromLock(path?: string): void
  /**
   * Save schemas to lock file
   *
   * Uses RuntimeAdapter for async writes instead of synchronous writeFileSync.
   * This prevents blocking the event loop during schema persistence.
   */
  saveToLock(tables: string[], path?: string): Promise<void>
  private serializeTableSchema
  private deserializeTableSchema
}
