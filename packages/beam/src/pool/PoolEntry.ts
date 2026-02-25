/**
 * @fileoverview Pool entry wrapper for connection metadata tracking
 * @module @gravito/beam/pool
 */

import type { PoolEntryMetadata } from './types'

/**
 * Wrapper for a single connection in the pool
 *
 * Encapsulates a logical connection (Bun fetch keep-alive socket) with
 * metadata tracking (creation time, last used time, use count, state).
 */
export class PoolEntry {
  private state: 'idle' | 'active' | 'draining' = 'idle'
  private useCount = 0
  private readonly createdAt = Date.now()
  private lastUsedAt = this.createdAt

  /**
   * Create a new pool entry
   *
   * @param id - Unique identifier for this connection
   * @param hostname - Hostname this connection is bound to
   */
  constructor(
    private readonly id: string,
    private readonly hostname: string
  ) {}

  /**
   * Get immutable metadata snapshot
   */
  getMetadata(): PoolEntryMetadata {
    return {
      id: this.id,
      hostname: this.hostname,
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      useCount: this.useCount,
      state: this.state,
    }
  }

  /**
   * Check if this connection is idle and available for reuse
   */
  isIdle(): boolean {
    return this.state === 'idle'
  }

  /**
   * Check if this connection has exceeded its maximum lifetime
   */
  isExpired(maxLifetimeMs: number): boolean {
    return Date.now() - this.createdAt > maxLifetimeMs
  }

  /**
   * Check if this connection has been idle too long
   */
  isIdleTooLong(idleTimeoutMs: number): boolean {
    return this.state === 'idle' && Date.now() - this.lastUsedAt > idleTimeoutMs
  }

  /**
   * Mark this connection as active (in use)
   */
  markActive(): void {
    if (this.state === 'idle') {
      this.state = 'active'
      this.lastUsedAt = Date.now()
      this.useCount++
    }
  }

  /**
   * Mark this connection as idle (released for reuse)
   */
  markIdle(): void {
    this.state = 'idle'
    this.lastUsedAt = Date.now()
  }

  /**
   * Mark this connection for draining (will be destroyed after current use)
   */
  markDraining(): void {
    this.state = 'draining'
  }

  /**
   * Check if connection is healthy (can be used)
   *
   * A connection is healthy if it's not in draining state.
   */
  isHealthy(): boolean {
    return this.state !== 'draining'
  }

  /**
   * Get the unique identifier for this connection
   */
  getId(): string {
    return this.id
  }

  /**
   * Get the hostname this connection is bound to
   */
  getHostname(): string {
    return this.hostname
  }
}
