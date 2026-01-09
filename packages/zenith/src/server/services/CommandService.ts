import type { CommandType, QuasarCommand } from '@gravito/quasar'
import { Redis } from 'ioredis'

/**
 * CommandService handles sending commands from Zenith to Quasar agents.
 *
 * This is the "control center" that publishes commands to Redis Pub/Sub.
 * Agents subscribe and execute commands locally.
 */
export class CommandService {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
    })
  }

  async connect(): Promise<void> {
    if (this.redis.status !== 'ready' && this.redis.status !== 'connecting') {
      await this.redis.connect()
    }
  }

  /**
   * Send a command to a specific Quasar agent.
   *
   * @param service - Target service name
   * @param nodeId - Target node ID (or '*' for broadcast)
   * @param type - Command type
   * @param payload - Command payload
   * @returns Command ID
   */
  async sendCommand(
    service: string,
    nodeId: string,
    type: CommandType,
    payload: QuasarCommand['payload']
  ): Promise<string> {
    const commandId = crypto.randomUUID()

    const command: QuasarCommand = {
      id: commandId,
      type,
      targetNodeId: nodeId,
      payload,
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const channel = `gravito:quasar:cmd:${service}:${nodeId}`

    await this.redis.publish(channel, JSON.stringify(command))

    console.log(`[CommandService] 📤 Sent ${type} to ${channel}`)
    return commandId
  }

  /**
   * Retry a job on a specific node.
   */
  async retryJob(
    service: string,
    nodeId: string,
    queue: string,
    jobKey: string,
    driver: 'redis' | 'laravel' = 'redis'
  ): Promise<string> {
    return this.sendCommand(service, nodeId, 'RETRY_JOB', {
      queue,
      jobKey,
      driver,
    })
  }

  /**
   * Delete a job on a specific node.
   */
  async deleteJob(
    service: string,
    nodeId: string,
    queue: string,
    jobKey: string,
    driver: 'redis' | 'laravel' = 'redis'
  ): Promise<string> {
    return this.sendCommand(service, nodeId, 'DELETE_JOB', {
      queue,
      jobKey,
      driver,
    })
  }

  /**
   * Broadcast a retry command to all nodes of a service.
   */
  async broadcastRetryJob(
    service: string,
    queue: string,
    jobKey: string,
    driver: 'redis' | 'laravel' = 'redis'
  ): Promise<string> {
    return this.retryJob(service, '*', queue, jobKey, driver)
  }

  /**
   * Broadcast a delete command to all nodes of a service.
   */
  async broadcastDeleteJob(
    service: string,
    queue: string,
    jobKey: string,
    driver: 'redis' | 'laravel' = 'redis'
  ): Promise<string> {
    return this.deleteJob(service, '*', queue, jobKey, driver)
  }

  /**
   * Send a Laravel-specific action (retry-all, restart) to a node.
   */
  async laravelAction(
    service: string,
    nodeId: string,
    action: 'retry-all' | 'restart' | 'retry',
    jobId?: string
  ): Promise<string> {
    return this.sendCommand(service, nodeId, 'LARAVEL_ACTION', {
      queue: 'default',
      jobKey: '*',
      action,
      jobId,
    })
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
