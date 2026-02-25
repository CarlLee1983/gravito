import { BunRedisClient } from './clients/BunRedisClient'
import { type ScriptDefinition, ScriptRegistry } from './ScriptRegistry'
import type { RedisClientContract, RedisConfig, RedisManagerConfig } from './types'

/**
 * Redis Connection Manager
 *
 * Coordinates multiple named Redis connections within a single application,
 * enabling multi-tenant architectures, read/write splitting, and service isolation.
 * Automatically selects the optimal client implementation (Bun.redis or ioredis)
 * based on runtime environment and configuration.
 *
 * @example
 * ```typescript
 * const manager = new RedisManager();
 * manager.configure({
 *   default: 'cache',
 *   connections: {
 *     cache: { host: 'localhost', port: 6379 },
 *     session: { host: 'localhost', port: 6380 }
 *   }
 * });
 * const cacheClient = manager.connection('cache');
 * const sessionClient = manager.connection('session');
 * ```
 */
export class RedisManager {
  private connections = new Map<string, RedisClientContract>()
  private defaultConnection = 'default'
  private configs = new Map<string, RedisConfig>()
  private scriptDefinitions = new Map<string, ScriptDefinition>()

  /**
   * Apply global connection settings.
   *
   * Registers multiple named connections and sets the default connection
   * for simplified access patterns. Must be called before accessing connections.
   *
   * @param config - Manager configuration with connection registry and default name.
   *
   * @example
   * ```typescript
   * manager.configure({
   *   default: 'primary',
   *   connections: {
   *     primary: { host: 'redis-1.example.com', port: 6379 },
   *     replica: { host: 'redis-2.example.com', port: 6379 }
   *   }
   * });
   * ```
   */
  configure(config: RedisManagerConfig): void {
    this.defaultConnection = config.default ?? 'default'

    for (const [name, connectionConfig] of Object.entries(config.connections)) {
      this.configs.set(name, connectionConfig)
    }
  }

  /**
   * Register a new connection dynamically.
   *
   * Allows adding connections at runtime without full reconfiguration,
   * useful for multi-tenant applications or feature flags.
   *
   * @param name - Unique identifier for this connection.
   * @param config - Connection-specific settings including host, port, and credentials.
   *
   * @example
   * ```typescript
   * manager.addConnection('metrics', {
   *   host: 'metrics.redis.example.com',
   *   port: 6379,
   *   db: 5
   * });
   * ```
   */
  addConnection(name: string, config: RedisConfig): void {
    this.configs.set(name, config)
  }

  /**
   * Retrieve a named connection instance.
   *
   * Lazily instantiates clients on first access to minimize resource usage.
   * Automatically selects Bun.redis or ioredis based on clientType configuration.
   *
   * @param name - Connection identifier. Omit to use the default connection.
   * @returns Active client instance ready for Redis commands.
   * @throws {Error} When the requested connection name is not configured.
   *
   * @example
   * ```typescript
   * const cache = manager.connection('cache');
   * await cache.set('user:123', JSON.stringify({ name: 'Alice' }));
   * ```
   */
  connection(name?: string): RedisClientContract {
    const connectionName = name ?? this.defaultConnection

    if (!this.connections.has(connectionName)) {
      const config = this.configs.get(connectionName)
      if (!config) {
        throw new Error(`Redis connection "${connectionName}" not configured`)
      }

      // Select implementation based on clientType
      const client = this.createClient(config)
      this.connections.set(connectionName, client)
    }

    return this.connections.get(connectionName)!
  }

  /**
   * Get script registry for a connection.
   *
   * All registries share the same script definitions. The registry allows
   * registering and executing Lua scripts with automatic SHA1 caching.
   *
   * @param name - Connection name. Defaults to default connection.
   * @returns ScriptRegistry instance for the specified connection.
   *
   * @example
   * ```typescript
   * const scripts = manager.scripts();
   * scripts.register('incr_by_two', 'return redis.call("INCRBY", KEYS[1], 2)');
   * const result = await scripts.execute('incr_by_two', ['my-key']);
   * ```
   */
  scripts(name?: string): ScriptRegistry {
    const client = this.connection(name)
    return new ScriptRegistry(client, this.scriptDefinitions)
  }

  /**
   * Factory method for client instantiation.
   *
   * Determines the optimal client implementation based on runtime environment
   * and configuration. Supports standard Redis connections and Redis Cluster.
   * In 'auto' mode, prefers Bun.redis when available for better performance.
   *
   * @param config - Connection configuration including optional clientType override and cluster settings.
   * @returns Initialized client instance (not yet connected).
   */
  private createClient(config: RedisConfig): RedisClientContract {
    // v2.0.0: Redis Cluster is no longer supported
    if (config.cluster?.enable || config.cluster?.nodes?.length) {
      throw new Error(
        'Redis Cluster is no longer supported in plasma v2.0.0. ' +
          'Use a Redis Cluster Proxy (e.g., redis-cluster-proxy, Envoy, HAProxy) instead. ' +
          'See MIGRATION.md for details.'
      )
    }

    // v2.0.0: Only BunRedisClient is supported (clientType deprecated)
    return new BunRedisClient(config)
  }

  /**
   * Get the default connection.
   *
   * @returns The default RedisClientContract instance.
   */
  getDefault(): RedisClientContract {
    return this.connection(this.defaultConnection)
  }

  /**
   * Connect all configured connections.
   *
   * @returns A promise that resolves when all connections are established.
   */
  async connectAll(): Promise<void> {
    for (const [name] of this.configs) {
      const client = this.connection(name)
      await client.connect()
    }
  }

  /**
   * Disconnect all connections.
   *
   * @returns A promise that resolves when all connections are closed.
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map((client) =>
      client.disconnect()
    )
    await Promise.all(disconnectPromises)
    this.connections.clear()
  }

  /**
   * Check if a connection exists.
   *
   * @param name - The name of the connection.
   * @returns True if configured, false otherwise.
   */
  hasConnection(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * Permanently remove a connection.
   *
   * Gracefully disconnects active connections before cleanup to prevent
   * connection leaks. Used during application shutdown or tenant offboarding.
   *
   * @param name - Connection identifier to remove.
   *
   * @example
   * ```typescript
   * await manager.removeConnection('tenant-456');
   * ```
   */
  async removeConnection(name: string): Promise<void> {
    const client = this.connections.get(name)
    if (client) {
      await client.disconnect()
      this.connections.delete(name)
    }
    this.configs.delete(name)
  }
}
