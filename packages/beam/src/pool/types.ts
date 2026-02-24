/**
 * @fileoverview Type definitions for HTTP connection pooling
 * @module @gravito/beam/pool
 */

/**
 * Connection pool configuration options
 *
 * Controls how the connection pool manages HTTP connections to backend services.
 * All settings have sensible defaults tuned for typical API usage patterns.
 *
 * @public
 */
export interface ConnectionPoolConfig {
  /**
   * Maximum number of concurrent connections per hostname
   *
   * Aligns with browser conventions (typically 6). Prevents overwhelming
   * backend services while maintaining good throughput.
   *
   * @default 6
   */
  maxConnectionsPerHost?: number

  /**
   * Minimum number of idle connections to maintain per hostname
   *
   * Keeps this many connections alive and ready for reuse, reducing
   * latency for subsequent requests. Set to 0 to disable (connections
   * are created on-demand).
   *
   * @default 0
   */
  minIdlePerHost?: number

  /**
   * How long (in milliseconds) an idle connection is kept alive before being closed
   *
   * Balances connection reuse against resource usage. Shorter timeouts
   * free resources faster; longer timeouts improve reuse rates.
   *
   * @default 30000 (30 seconds)
   */
  idleTimeoutMs?: number

  /**
   * Maximum lifetime of a connection in milliseconds
   *
   * Even if idle, connections are destroyed after this duration to prevent
   * issues like stale connection state or expired server-side sessions.
   *
   * @default 300000 (5 minutes)
   */
  maxLifetimeMs?: number

  /**
   * Maximum time (in milliseconds) to wait for an available connection
   *
   * When the pool is exhausted, requests wait in a queue. If this timeout
   * expires before a connection becomes available, a BeamPoolExhaustedError is thrown.
   *
   * @default 5000 (5 seconds)
   */
  acquireTimeoutMs?: number

  /**
   * Enable periodic health checks on idle connections
   *
   * When enabled, idle connections are periodically probed to verify they're
   * still alive. Dead connections are removed from the pool.
   *
   * @default true
   */
  healthCheck?: boolean

  /**
   * How often (in milliseconds) to run health checks on idle connections
   *
   * Only used if healthCheck is true.
   *
   * @default 60000 (60 seconds)
   */
  healthCheckIntervalMs?: number

  /**
   * Enable metrics collection for pool operations
   *
   * When enabled, detailed metrics are collected (connection reuse rate,
   * acquisition time histogram, etc.). Access via pool.getMetrics().
   *
   * @default false
   */
  metrics?: boolean
}

/**
 * Immutable snapshot of a connection pool entry's state
 *
 * Represents a single connection managed by the pool at a point in time.
 *
 * @public
 */
export interface PoolEntryMetadata {
  /**
   * Unique identifier for this connection
   */
  readonly id: string

  /**
   * Hostname this connection is bound to
   */
  readonly hostname: string

  /**
   * Timestamp when this connection was created (milliseconds since epoch)
   */
  readonly createdAt: number

  /**
   * Timestamp when this connection was last used (milliseconds since epoch)
   */
  readonly lastUsedAt: number

  /**
   * Number of times this connection has been reused (0 = never reused)
   */
  readonly useCount: number

  /**
   * Current state of the connection
   *
   * - 'idle': Waiting in the idle queue, available for reuse
   * - 'active': Currently in use by a request
   * - 'draining': Marked for destruction after current request completes
   */
  readonly state: 'idle' | 'active' | 'draining'
}

/**
 * Immutable snapshot of pool metrics for a specific hostname
 *
 * @public
 */
export interface HostPoolMetrics {
  /**
   * Hostname for these metrics
   */
  readonly hostname: string

  /**
   * Number of connections currently in use
   */
  readonly active: number

  /**
   * Number of idle connections available for reuse
   */
  readonly idle: number

  /**
   * Number of requests waiting for a connection
   */
  readonly waiting: number

  /**
   * Maximum allowed concurrent connections for this host
   */
  readonly maxConnections: number
}

/**
 * Immutable snapshot of overall pool metrics
 *
 * Captured at a specific point in time. Safe to store and compare across
 * multiple snapshots to detect trends.
 *
 * @public
 */
export interface PoolMetricsSnapshot {
  /**
   * Timestamp when this snapshot was captured (milliseconds since epoch)
   */
  readonly timestamp: number

  /**
   * Total number of connections currently in use across all hosts
   */
  readonly totalActive: number

  /**
   * Total number of idle connections across all hosts
   */
  readonly totalIdle: number

  /**
   * Total number of requests waiting for a connection across all hosts
   */
  readonly totalWaiting: number

  /**
   * Total number of connections created since pool initialization
   */
  readonly totalCreated: number

  /**
   * Total number of connections destroyed since pool initialization
   */
  readonly totalDestroyed: number

  /**
   * Total number of times a connection was reused since pool initialization
   */
  readonly totalReused: number

  /**
   * Reuse rate: (totalReused / totalCreated) as a number between 0 and 1
   *
   * Higher values indicate more efficient connection reuse.
   * A rate of 0.8 means 80% of connections have been reused at least once.
   */
  readonly reuseRate: number

  /**
   * Average time (in milliseconds) to acquire a connection
   *
   * Includes both time waiting in queue and time for connection handshake.
   * Lower values indicate faster acquisition (better cache performance).
   */
  readonly avgAcquireTimeMs: number

  /**
   * Per-hostname metrics
   *
   * Keyed by hostname (e.g., 'api.example.com'). Allows analyzing
   * pool behavior per backend service.
   */
  readonly byHost: ReadonlyMap<string, HostPoolMetrics>
}
