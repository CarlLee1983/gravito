/**
 * @gravito/atlas - Replica Connection Pool
 * @description Manages read/write replica connections with Round-robin load balancing.
 *
 * Wraps a write (primary) connection and a pool of read (replica) connections.
 * Transparently routes SELECT queries to read replicas and mutations to the primary.
 */
import type { ConnectionContract } from '../types'
/**
 * ReplicaConnectionPool
 *
 * Holds one authoritative write connection and N read replica connections.
 * Applies Round-robin selection across replicas to balance read load.
 *
 * Usage:
 * ```typescript
 * const pool = new ReplicaConnectionPool(writeConn, [replica1, replica2])
 * const readConn = pool.getReadConnection()    // Round-robin
 * const writeConn = pool.getWriteConnection()  // Always primary
 * ```
 */
export declare class ReplicaConnectionPool {
  private readonly writeConnection
  private readonly readConnections
  private roundRobinIndex
  constructor(writeConnection: ConnectionContract, readConnections?: ConnectionContract[])
  /**
   * Get the primary write connection (always the same node).
   */
  getWriteConnection(): ConnectionContract
  /**
   * Get a read replica connection using Round-robin selection.
   *
   * Falls back to the write connection if no replicas are configured.
   */
  getReadConnection(): ConnectionContract
  /**
   * Whether this pool has any read replicas configured.
   */
  hasReplicas(): boolean
  /**
   * Total number of replica connections in the pool.
   */
  replicaCount(): number
  /**
   * Disconnect all connections (write + all replicas).
   */
  disconnectAll(): Promise<void>
  /**
   * Reset round-robin index (useful for testing).
   * @internal
   */
  _resetIndex(): void
}
