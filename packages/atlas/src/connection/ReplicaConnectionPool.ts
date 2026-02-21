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
export class ReplicaConnectionPool {
  private readonly writeConnection: ConnectionContract
  private readonly readConnections: ConnectionContract[]
  private roundRobinIndex = 0

  constructor(writeConnection: ConnectionContract, readConnections: ConnectionContract[] = []) {
    this.writeConnection = writeConnection
    this.readConnections = readConnections
  }

  /**
   * Get the primary write connection (always the same node).
   */
  getWriteConnection(): ConnectionContract {
    return this.writeConnection
  }

  /**
   * Get a read replica connection using Round-robin selection.
   *
   * Falls back to the write connection if no replicas are configured.
   */
  getReadConnection(): ConnectionContract {
    if (this.readConnections.length === 0) {
      return this.writeConnection
    }

    const connection = this.readConnections[this.roundRobinIndex % this.readConnections.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % this.readConnections.length

    // Safety: if somehow index resolves to undefined, fall back to write
    return connection ?? this.writeConnection
  }

  /**
   * Whether this pool has any read replicas configured.
   */
  hasReplicas(): boolean {
    return this.readConnections.length > 0
  }

  /**
   * Total number of replica connections in the pool.
   */
  replicaCount(): number {
    return this.readConnections.length
  }

  /**
   * Disconnect all connections (write + all replicas).
   */
  async disconnectAll(): Promise<void> {
    const tasks: Promise<void>[] = [this.writeConnection.disconnect()]

    for (const replica of this.readConnections) {
      tasks.push(replica.disconnect())
    }

    await Promise.all(tasks)
  }

  /**
   * Reset round-robin index (useful for testing).
   * @internal
   */
  _resetIndex(): void {
    this.roundRobinIndex = 0
  }
}
