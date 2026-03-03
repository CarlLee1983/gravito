/**
 * Bun SQL Prepared Statement Manager
 * @description Manages prepared statement caching, lifecycle, and optimization with LRU eviction
 */
import type { BunSQLClient } from './types'
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
export declare class BunSQLPreparedStatementManager {
  private readonly client
  private cache
  private sqlToName
  private readonly config
  private metrics
  constructor(client: BunSQLClient, config?: PreparedStatementManagerConfig)
  /**
   * Prepare a SQL statement for repeated execution
   *
   * @param sql - SQL query to prepare
   * @returns Prepared statement identifier
   */
  prepare(sql: string): Promise<string>
  /**
   * Execute a prepared statement
   *
   * @param name - Prepared statement identifier
   * @param bindings - Query parameters
   * @returns Query result rows
   */
  execute<T = Record<string, unknown>>(name: string, bindings?: unknown[]): Promise<T[]>
  /**
   * Clear all prepared statements
   */
  clear(): Promise<void>
  /**
   * Get cache metrics
   *
   * @returns Cache metrics including hit rate and eviction count
   */
  getMetrics(): PreparedStatementMetrics
  /**
   * Get individual statement usage statistics
   *
   * @param name - Prepared statement identifier
   * @returns Usage statistics or null if not found
   */
  getStats(name: string): {
    useCount: number
    createdAt: number
  } | null
  /**
   * Get the number of cached statements
   */
  getSize(): number
  /**
   * Destroy the manager and clean up resources
   */
  destroy(): Promise<void>
  /**
   * Generate a unique statement name from SQL hash
   * @private
   */
  private generateStatementName
}
