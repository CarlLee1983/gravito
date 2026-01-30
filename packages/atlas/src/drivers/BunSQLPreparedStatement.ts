/**
 * Bun SQL Prepared Statement Manager
 * @description Manages prepared statement caching, lifecycle, and optimization
 */

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
  private statements = new Map<string, PreparedStatementMetadata>()
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

    // Check if we need to evict old statements
    if (this.statements.size >= this.config.maxStatements) {
      this.evictLeastRecentlyUsed()
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

    // Update usage statistics
    metadata.lastUsed = Date.now()
    metadata.useCount++

    // Execute the prepared statement
    const result = await metadata.stmt.all(...bindings)
    return result as T[]
  }

  /**
   * Clear all prepared statements
   */
  async clear(): Promise<void> {
    // Finalize all statements
    for (const [name, metadata] of this.statements) {
      try {
        metadata.stmt.finalize()
      } catch (error) {
        // Ignore finalization errors
        console.warn(`Failed to finalize statement ${name}:`, error)
      }
    }

    this.statements.clear()
    this.sqlToName.clear()
  }

  /**
   * Clean up idle statements
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [name, metadata] of this.statements) {
      const idleTime = now - metadata.lastUsed
      if (idleTime > this.config.idleTimeout) {
        toRemove.push(name)
      }
    }

    // Remove idle statements
    for (const name of toRemove) {
      const metadata = this.statements.get(name)
      if (metadata) {
        try {
          metadata.stmt.finalize()
        } catch (error) {
          console.warn(`Failed to finalize idle statement ${name}:`, error)
        }
        this.statements.delete(name)
        this.sqlToName.delete(metadata.sql)
      }
    }
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
   * Evict the least recently used statement
   * @private
   */
  private evictLeastRecentlyUsed(): void {
    let oldestName: string | null = null
    let oldestTime = Number.POSITIVE_INFINITY

    // Find the least recently used statement
    for (const [name, metadata] of this.statements) {
      if (metadata.lastUsed < oldestTime) {
        oldestTime = metadata.lastUsed
        oldestName = name
      }
    }

    // Remove it
    if (oldestName) {
      const metadata = this.statements.get(oldestName)
      if (metadata) {
        try {
          metadata.stmt.finalize()
        } catch (error) {
          console.warn(`Failed to finalize evicted statement ${oldestName}:`, error)
        }
        this.statements.delete(oldestName)
        this.sqlToName.delete(metadata.sql)
      }
    }
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
