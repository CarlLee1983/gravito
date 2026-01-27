import { EventEmitter } from 'events'
import type { Redis } from 'ioredis'
import { QUASAR_KEYS } from '../constants'
import type { Logger } from './logger'

/**
 * Options for configuring the Redis-based leader election process.
 *
 * @interface LeaderElectionOptions
 * @public
 * @since 6.0.0
 */
export interface LeaderElectionOptions {
  /**
   * The name of the service this node belongs to.
   * Used to partition leader election by service.
   */
  service: string

  /**
   * A unique identifier for this specific node.
   * Typically 'hostname-pid'.
   */
  nodeId: string

  /**
   * Time-to-live (TTL) for the leader lock in milliseconds.
   * If the leader crashes, it will take this long for a new leader to be elected.
   * @default 15000
   */
  ttl?: number

  /**
   * Interval at which to refresh or attempt to acquire the leader lock in milliseconds.
   * @default 5000
   */
  interval?: number
}

/**
 * Implements a distributed leader election mechanism using Redis and the SET NX PX pattern.
 *
 * Ensures that within a cluster of nodes sharing the same service name, only one node
 * is designated as the "leader" at any given time. This is used for coordinating
 * global tasks like maintenance, cleanup, or consolidated reporting.
 *
 * @class LeaderElection
 * @extends EventEmitter
 * @public
 * @since 6.0.0
 *
 * @event leader - Fired when this node is elected as the leader.
 * @event follower - Fired when this node loses leadership or fails to acquire it.
 *
 * @example
 * ```typescript
 * const election = new LeaderElection(redis, { service: 'api', nodeId: 'host-1' }, logger);
 * election.on('leader', () => console.log('I am the leader!'));
 * election.start();
 * ```
 */
export class LeaderElection extends EventEmitter {
  private redis: Redis
  private logger: Logger
  private service: string
  private nodeId: string
  private ttl: number
  private interval: number
  private lockKey: string
  private running = false
  private leader = false
  private timer?: Timer

  constructor(redis: Redis, options: LeaderElectionOptions, logger: Logger) {
    super()
    this.redis = redis
    this.logger = logger
    this.service = options.service
    this.nodeId = options.nodeId
    this.ttl = options.ttl || 15000
    this.interval = options.interval || 5000
    this.lockKey = `${QUASAR_KEYS.LEADER_PREFIX}${this.service}`
  }

  /**
   * Returns true if this node is currently the leader.
   */
  isLeader(): boolean {
    return this.leader
  }

  /**
   * Start the leader election loop.
   */
  start() {
    if (this.running) return
    this.running = true
    this.tick()
  }

  /**
   * Stop the leader election loop and release leadership if held.
   */
  async stop() {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    if (this.leader) {
      try {
        // Only release if we are still the owner
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `
        await this.redis.eval(script, 1, this.lockKey, this.nodeId)
      } catch (err) {
        this.logger.error('[Quasar] Failed to release leader lock', err)
      }
      this.leader = false
      this.emit('follower')
    }
  }

  private async tick() {
    if (!this.running) return

    try {
      const result = await this.redis.set(this.lockKey, this.nodeId, 'PX', this.ttl, 'NX')

      if (result === 'OK') {
        if (!this.leader) {
          this.leader = true
          this.logger.info(`[Quasar] 👑 Node ${this.nodeId} is now the leader for ${this.service}`)
          this.emit('leader')
        }
      } else {
        // Check if we are already the leader and just need to refresh
        const currentLeader = await this.redis.get(this.lockKey)
        if (currentLeader === this.nodeId) {
          // Refresh TTL
          await this.redis.pexpire(this.lockKey, this.ttl)
          if (!this.leader) {
            this.leader = true
            this.emit('leader')
          }
        } else {
          if (this.leader) {
            this.leader = false
            this.logger.info(`[Quasar] 👥 Node ${this.nodeId} is no longer the leader`)
            this.emit('follower')
          }
        }
      }
    } catch (err) {
      this.logger.error('[Quasar] Leader election tick failed', err)
    }

    if (this.running) {
      this.timer = setTimeout(() => this.tick(), this.interval)
    }
  }
}
