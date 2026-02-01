import { RedisClient } from './RedisClient'
import type { RedisClientContract, RedisConfig } from './types'

// biome-ignore lint/suspicious/noExplicitAny: ioredis cluster has complex method signatures
interface IORedisCluster extends Record<string, any> {
  connect(): Promise<void>
  quit(): Promise<'OK'>
  disconnect(): void
  nodes(role?: 'master' | 'slave' | 'all'): any[]
}

// biome-ignore lint/suspicious/noExplicitAny: Dynamic instantiation
interface IORedisModule {
  Cluster: new (nodes: any[], options: any) => IORedisCluster
}

/**
 * Redis Cluster Client Wrapper
 *
 * This class provides a wrapper around the `ioredis.Cluster` client,
 * adapting it to the `RedisClientContract` used within the Gravito framework.
 * It handles dynamic loading of the `ioredis` module and manages the cluster connection lifecycle.
 *
 * @see {@link https://github.com/redis/ioredis#cluster} for more information on ioredis Cluster.
 */
export class RedisClusterClient extends RedisClient implements RedisClientContract {
  /**
   * The underlying ioredis Cluster instance.
   * @internal
   */
  private cluster: IORedisCluster | null = null

  /**
   * The dynamically loaded ioredis module.
   * @internal
   */
  private ioredisModule: IORedisModule | null = null

  /**
   * Creates a new RedisClusterClient instance.
   *
   * @param config - The Redis configuration object containing cluster settings.
   */
  constructor(protected readonly config: RedisConfig) {
    super(config)
  }

  /**
   * Establishes a connection to the Redis Cluster.
   *
   * This method dynamically loads the `ioredis` module, initializes the cluster client
   * with the provided configuration, and sets up event listeners for connection status.
   * If already connected, it returns immediately.
   *
   * @returns A promise that resolves when the connection is established.
   * @throws Error if the `ioredis` module cannot be loaded.
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      return
    }

    this.ioredisModule = await this.loadIORedisModule()

    const nodes = this.config.cluster?.nodes ?? [
      {
        host: this.config.host ?? 'localhost',
        port: this.config.port ?? 6379,
      },
    ]

    const clusterOptions = {
      redisOptions: {
        password: this.config.password,
        db: this.config.db ?? 0,
        tls: this.config.tls,
        keyPrefix: this.config.keyPrefix,
      },
      scaleReads: this.config.cluster?.scaleReads ?? 'master',
      ...this.config.cluster?.redisOptions,
    }

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic instantiation
    this.cluster = new this.ioredisModule.Cluster(nodes, clusterOptions)

    // biome-ignore lint/suspicious/noExplicitAny: compatible interface
    this.setClient(this.cluster as any)
    this.connected = true

    this.cluster?.on('connect', () => {
      this.connected = true
    })
    this.cluster?.on('close', () => {
      this.connected = false
    })
  }

  /**
   * Disconnects from the Redis Cluster.
   *
   * Gracefully closes the cluster connection and cleans up the internal client instance.
   *
   * @returns A promise that resolves when the disconnection is complete.
   */
  override async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit()
      this.cluster = null
    }
    this.connected = false
  }

  /**
   * Checks the health of the Redis Cluster connection.
   *
   * Sends a PING command to the cluster and verifies the response.
   *
   * @returns A promise that resolves to `true` if the cluster is healthy, `false` otherwise.
   */
  override async checkHealth(): Promise<boolean> {
    try {
      if (!this.isConnected() || !this.cluster) {
        return false
      }
      const res = await this.cluster.ping()
      return res === 'PONG'
    } catch {
      return false
    }
  }

  /**
   * Dynamically loads the `ioredis` module.
   *
   * @returns A promise that resolves to the loaded `IORedisModule`.
   * @throws Error if `ioredis` is not installed.
   * @internal
   */
  private async loadIORedisModule(): Promise<IORedisModule> {
    try {
      return (await import('ioredis')) as unknown as IORedisModule
    } catch {
      throw new Error('Redis Cluster requires "ioredis". Please install: bun add ioredis')
    }
  }
}
