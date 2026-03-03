/**
 * @gravito/atlas - Connection Pool Warmer
 * @description Preheats connection pools during initialization
 */
import type { ConnectionManager } from '../connection/ConnectionManager'
export interface PoolWarmerConfig {
  /**
   * Target number of connections to warm for each pool
   * @default 2
   */
  targetConnections?: number
  /**
   * Number of concurrent warmup queries
   * @default 2
   */
  concurrency?: number
  /**
   * Timeout (ms) for each warmup query
   * @default 5000
   */
  timeout?: number
  /**
   * Callback when warmup completes
   */
  onComplete?: (result: WarmupResult) => void
  /**
   * Callback for individual connection warmup
   */
  onConnectionWarmed?: (connection: string, duration: number) => void
}
export interface ConnectionWarmupResult {
  /**
   * Whether warmup succeeded
   */
  success: boolean
  /**
   * Connection name
   */
  connection: string
  /**
   * Time spent warming up (ms)
   */
  duration: number
  /**
   * Error message (if failed)
   */
  error?: string
}
export interface WarmupResult {
  /**
   * Total connections processed
   */
  total: number
  /**
   * Number of successful warmups
   */
  successful: number
  /**
   * Number of failed warmups
   */
  failed: number
  /**
   * Results for each connection
   */
  results: Record<string, ConnectionWarmupResult>
  /**
   * Total duration (ms)
   */
  duration: number
}
export declare const DEFAULT_WARMER_CONFIG: PoolWarmerConfig
/**
 * Connection pool warmer
 * Preheats pools by establishing connections
 */
export declare class PoolWarmer {
  private connectionManager
  private config
  constructor(connectionManager: ConnectionManager, config: PoolWarmerConfig)
  /**
   * Warm all connection pools
   */
  warmAll(): Promise<WarmupResult>
  /**
   * Warm a specific connection pool
   */
  warmConnection(name: string): Promise<ConnectionWarmupResult>
  /**
   * Execute a warmup query with timeout
   */
  private executeWarmupQuery
}
