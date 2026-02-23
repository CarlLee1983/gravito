/**
 * Bun SQL Prepared Statement Manager
 * @description Manages prepared statement caching, lifecycle, and optimization
 */

import { LRUCache } from 'lru-cache'

import type { BunSQLClient, BunSQLPreparedStatement } from './types'

/**
 * Configuration options for prepared statement manager
 */
export interface PreparedStatementManagerConfig {
  /**
   * Maximum number of prepared statements to cache
   * @default 100
   */
  maxStatements?: number

  /**
   * Idle timeout in milliseconds before a statement is removed
   * @default 60000 (1 minute)
   */
  idleTimeout?: number
}

/**
 * Prepared statement metadata
 */
interface PreparedStatementMetadata {
  /**
   * The prepared statement instance
   */
  stmt: BunSQLPreparedStatement

  /**
   * Last used timestamp (milliseconds)
   */
  lastUsed: number

  /**
   * Number of times this statement has been executed
   */
  useCount: number

  /**
   * Original SQL query
   */
  sql: string
}

/**
 * Prepared Statement Manager for BunSQL
 *
 * Manages statement caching and lifecycle to optimize query performance.
 * Features:
 * - LRU (Least Recently Used) cache eviction
 * - Idle timeout cleanup
 * - Usage statistics tracking
 *
 * @example
 * ```typescript
 * const manager = new BunSQLPreparedStatementManager(client)
 *
 * // Prepare a statement
 * const stmtId = await manager.prepare('SELECT * FROM users WHERE id = ?')
 *
 * // Execute multiple times
 * const users1 = await manager.execute(stmtId, [1])
 * const users2 = await manager.execute(stmtId, [2])
 *
 * // Clean up
 * await manager.clear()
 * ```
 */
export class BunSQLPreparedStatementManager {
  private statements: LRUCache<string, PreparedStatementMetadata>
  private sqlToName = new Map<string, string>()
  private readonly config: Required<PreparedStatementManagerConfig>
  private cleanupTimer?: Timer

  constructor(
    private readonly client: BunSQLClient,
    config: PreparedStatementManagerConfig = {}
  ) {
    this.config = {
      maxStatements: config.maxStatements ?? 100,
      idleTimeout: config.idleTimeout ?? 60000, // 1 minute
    }

    this.statements = new LRUCache<string, PreparedStatementMetadata>({
      max: this.config.maxStatements,
      ttl: this.config.idleTimeout,
      ttlAutopurge: false,
      allowStale: false,
      dispose: (metadata) => {
        // LRU 驅逐時自動清理 sqlToName 並 finalize
        this.sqlToName.delete(metadata.sql)
        try {
          metadata.stmt.finalize()
        } catch {
          // ignore finalization errors
        }
      },
    })

    // Start periodic cleanup
    this.startCleanupTimer()
  }

  /**
   * Prepare a SQL statement for repeated execution
   *
   * @param sql - SQL query to prepare
   * @returns Prepared statement identifier
   */
  async prepare(sql: string): Promise<string> {
    // Check if already prepared
    const existing = this.sqlToName.get(sql)
    if (existing && this.statements.has(existing)) {
      return existing
    }

    // Prepare the statement
    if (!this.client.prepare) {
      throw new Error('Bun.sql client does not support prepared statements')
    }

    const stmt = this.client.prepare(sql)
    const name = this.generateStatementName(sql)

    // Store metadata
    this.statements.set(name, {
      stmt,
      lastUsed: Date.now(),
      useCount: 0,
      sql,
    })
    this.sqlToName.set(sql, name)

    return name
  }

  /**
   * Execute a prepared statement
   *
   * @param name - Prepared statement identifier
   * @param bindings - Query parameters
   * @returns Query result rows
   */
  async execute<T = Record<string, unknown>>(name: string, bindings: unknown[] = []): Promise<T[]> {
    const metadata = this.statements.get(name)
    if (!metadata) {
      throw new Error(`Prepared statement not found: ${name}`)
    }

    // Update usage count (LRU handles lastUsed tracking automatically)
    metadata.useCount++

    // Execute the prepared statement
    const result = await metadata.stmt.all(...bindings)
    return result as T[]
  }

  /**
   * Clear all prepared statements
   */
  async clear(): Promise<void> {
    this.statements.clear()
    this.sqlToName.clear()
  }

  /**
   * Clean up idle statements
   */
  async cleanup(): Promise<void> {
    this.statements.purgeStale()
  }

  /**
   * Get statement usage statistics
   *
   * @param name - Prepared statement identifier
   * @returns Usage statistics or null if not found
   */
  getStats(name: string): { useCount: number; lastUsed: number } | null {
    const metadata = this.statements.get(name)
    if (!metadata) {
      return null
    }

    return {
      useCount: metadata.useCount,
      lastUsed: metadata.lastUsed,
    }
  }

  /**
   * Get the number of cached statements
   */
  getSize(): number {
    return this.statements.size
  }

  /**
   * Destroy the manager and clean up resources
   */
  async destroy(): Promise<void> {
    this.stopCleanupTimer()
    await this.clear()
  }

  /**
   * Generate a unique statement name
   * @private
   */
  private generateStatementName(sql: string): string {
    // Use a hash-like approach for consistency
    const hash = this.simpleHash(sql)
    const timestamp = Date.now()
    return `stmt_${hash}_${timestamp}`
  }

  /**
   * Simple hash function for SQL strings
   * @private
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Start periodic cleanup timer
   * @private
   */
  private startCleanupTimer(): void {
    // Run cleanup every 30 seconds
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        console.warn('Prepared statement cleanup failed:', error)
      })
    }, 30000)
  }

  /**
   * Stop cleanup timer
   * @private
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }
}
