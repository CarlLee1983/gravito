/**
 * Bun SQL Prepared Statement Manager
 * @description Manages prepared statement caching, lifecycle, and optimization with LRU eviction
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

  /**
   * Enable metrics tracking (hit rate, evictions, etc.)
   * @default true
   */
  enableMetrics?: boolean
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
   * Number of times this statement has been executed
   */
  useCount: number

  /**
   * Original SQL query
   */
  sql: string

  /**
   * Creation timestamp (milliseconds)
   */
  createdAt: number
}

/**
 * Prepared statement cache metrics
 */
export interface PreparedStatementMetrics {
  /**
   * Total cache hits
   */
  hits: number

  /**
   * Total cache misses
   */
  misses: number

  /**
   * Total evictions
   */
  evictions: number

  /**
   * Total statement executions
   */
  executions: number

  /**
   * Current cache size
   */
  cacheSize: number

  /**
   * Cache hit rate (0-1)
   */
  hitRate: number
}

/**
 * Prepared Statement Manager for BunSQL
 *
 * Manages statement caching and lifecycle to optimize query performance.
 * Features:
 * - LRU (Least Recently Used) cache eviction with O(1) performance
 * - Automatic TTL-based cleanup (no manual timer needed)
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
 * // Get metrics
 * const metrics = manager.getMetrics()
 *
 * // Clean up
 * await manager.clear()
 * ```
 */
export class BunSQLPreparedStatementManager {
  private cache: LRUCache<string, PreparedStatementMetadata>
  private sqlToName = new Map<string, string>()
  private readonly config: Required<PreparedStatementManagerConfig>
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    executions: 0,
  }
  private statementCounter = 0

  constructor(
    private readonly client: BunSQLClient,
    config: PreparedStatementManagerConfig = {}
  ) {
    const { maxStatements = 100, idleTimeout = 60000, enableMetrics = true } = config

    this.config = {
      maxStatements,
      idleTimeout,
      enableMetrics,
    }

    // Initialize LRUCache with automatic TTL and disposal callback
    this.cache = new LRUCache<string, PreparedStatementMetadata>({
      max: this.config.maxStatements,
      ttl: this.config.idleTimeout,
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      ttlAutopurge: true,
      // Automatic cleanup on eviction/deletion: finalize statement and remove SQL mapping
      dispose: (value: PreparedStatementMetadata, key: string, reason: string) => {
        if (reason === 'evict' || reason === 'expire') {
          this.metrics.evictions++
        }
        try {
          value.stmt.finalize()
        } catch (e) {
          // 忽略終結化錯誤
          console.warn(`Failed to finalize ${reason} statement ${key}:`, e)
        }
        this.sqlToName.delete(value.sql)
      },
    })
  }

  /**
   * Prepare a SQL statement for repeated execution
   *
   * @param sql - SQL query to prepare
   * @returns Prepared statement identifier
   */
  async prepare(sql: string): Promise<string> {
    // Check if already prepared (cache hit)
    const existing = this.sqlToName.get(sql)
    if (existing && this.cache.has(existing)) {
      this.metrics.hits++
      return existing
    }

    this.metrics.misses++

    // Prepare new statement
    if (!this.client.prepare) {
      throw new Error('Bun.sql client does not support prepared statements')
    }

    const stmt = this.client.prepare(sql)
    const name = this.generateStatementName(sql)

    // Store in LRUCache (automatic eviction if full)
    this.cache.set(name, {
      stmt,
      useCount: 0,
      sql,
      createdAt: Date.now(),
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
    const metadata = this.cache.get(name)
    if (!metadata) {
      throw new Error(`Prepared statement not found: ${name}`)
    }

    // Update usage statistics
    metadata.useCount++
    this.metrics.executions++

    // Update in cache to refresh TTL and LRU position
    this.cache.set(name, metadata)

    // Execute the prepared statement
    const result = await metadata.stmt.all(...bindings)
    return result as T[]
  }

  /**
   * Clear all prepared statements
   */
  async clear(): Promise<void> {
    // LRUCache.clear() triggers dispose callbacks for all entries
    this.cache.clear()
    this.sqlToName.clear()
  }

  /**
   * Get cache metrics
   *
   * @returns Cache metrics including hit rate and eviction count
   */
  getMetrics(): PreparedStatementMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
      executions: this.metrics.executions,
      cacheSize: this.cache.size,
      hitRate,
    }
  }

  /**
   * Get individual statement usage statistics
   *
   * @param name - Prepared statement identifier
   * @returns Usage statistics or null if not found
   */
  getStats(name: string): { useCount: number; createdAt: number } | null {
    const metadata = this.cache.get(name)
    if (!metadata) {
      return null
    }

    return {
      useCount: metadata.useCount,
      createdAt: metadata.createdAt,
    }
  }

  /**
   * Get the number of cached statements
   */
  getSize(): number {
    return this.cache.size
  }

  /**
   * Destroy the manager and clean up resources
   */
  async destroy(): Promise<void> {
    await this.clear()
  }

  /**
   * Generate a unique statement name using monotonic counter
   * @private
   */
  private generateStatementName(sql: string): string {
    const existing = this.sqlToName.get(sql)
    if (existing) {
      return existing
    }
    const name = `stmt_${++this.statementCounter}`
    this.sqlToName.set(sql, name)
    return name
  }
}
