import type { Redis } from 'ioredis'
import { DeleteJobExecutor } from './executors/DeleteJobExecutor'
import { RetryJobExecutor } from './executors/RetryJobExecutor'
import type { CommandExecutor, CommandResult, CommandType, QuasarCommand } from './types'

/**
 * CommandListener subscribes to Redis Pub/Sub for incoming commands from Zenith.
 *
 * Architecture:
 * - Uses a dedicated Redis connection for SUBSCRIBE (blocking)
 * - Executes commands on the monitorRedis connection (non-blocking)
 * - Only allows whitelisted command types
 */
export class CommandListener {
  private subscriber: Redis
  private nodeId: string
  private service: string
  private executors: Map<CommandType, CommandExecutor>
  private isListening = false

  // Security: Hardcoded allowlist
  private readonly ALLOWED_COMMANDS: CommandType[] = ['RETRY_JOB', 'DELETE_JOB']

  /**
   * @param subscriberRedis - Dedicated Redis connection for SUBSCRIBE
   * @param service - Service name (for channel pattern)
   * @param nodeId - This agent's unique ID
   */
  constructor(subscriberRedis: Redis, service: string, nodeId: string) {
    this.subscriber = subscriberRedis
    this.service = service
    this.nodeId = nodeId

    // Register all executors
    this.executors = new Map()
    this.registerExecutor(new RetryJobExecutor())
    this.registerExecutor(new DeleteJobExecutor())
  }

  private registerExecutor(executor: CommandExecutor): void {
    this.executors.set(executor.supportedType, executor)
  }

  /**
   * Get the channel pattern for this agent.
   * Pattern: gravito:quasar:cmd:{service}:{node_id}
   *
   * Also listens to broadcast channel: gravito:quasar:cmd:{service}:*
   */
  private getChannelPattern(): string {
    return `gravito:quasar:cmd:${this.service}:${this.nodeId}`
  }

  private getBroadcastChannel(): string {
    return `gravito:quasar:cmd:${this.service}:*`
  }

  /**
   * Start listening for commands.
   * @param monitorRedis - Redis connection for executing commands
   */
  async start(monitorRedis: Redis): Promise<void> {
    if (this.isListening) {
      console.warn('[Quasar] CommandListener already started')
      return
    }

    const channel = this.getChannelPattern()
    const broadcastPattern = this.getBroadcastChannel()

    // Subscribe to both specific channel and broadcast pattern
    await this.subscriber.subscribe(channel)
    console.log(`[Quasar] 📡 Listening for commands on: ${channel}`)

    // Listen for messages
    this.subscriber.on('message', async (ch: string, message: string) => {
      if (ch !== channel) return

      try {
        const command = JSON.parse(message) as QuasarCommand
        await this.handleCommand(command, monitorRedis)
      } catch (err) {
        console.error('[Quasar] Failed to parse command:', err)
      }
    })

    // Also subscribe to pattern for broadcast commands (optional)
    await this.subscriber.psubscribe(broadcastPattern)
    this.subscriber.on('pmessage', async (_pattern: string, ch: string, message: string) => {
      // Ignore if we already handled it on the specific channel
      if (ch === channel) return

      try {
        const command = JSON.parse(message) as QuasarCommand
        // Only handle if it's for us or broadcast
        if (command.targetNodeId === this.nodeId || command.targetNodeId === '*') {
          await this.handleCommand(command, monitorRedis)
        }
      } catch (err) {
        console.error('[Quasar] Failed to parse broadcast command:', err)
      }
    })

    this.isListening = true
  }

  /**
   * Handle an incoming command.
   */
  private async handleCommand(command: QuasarCommand, redis: Redis): Promise<void> {
    console.log(`[Quasar] 📥 Received command: ${command.type} (id: ${command.id})`)

    // Security check: Is this command type allowed?
    if (!this.ALLOWED_COMMANDS.includes(command.type)) {
      console.warn(`[Quasar] ⚠️ Command type not allowed: ${command.type}`)
      return
    }

    // Security check: Is this command for us?
    if (command.targetNodeId !== this.nodeId && command.targetNodeId !== '*') {
      console.warn(`[Quasar] ⚠️ Command not for this node: ${command.targetNodeId}`)
      return
    }

    // Get executor
    const executor = this.executors.get(command.type)
    if (!executor) {
      console.warn(`[Quasar] ⚠️ No executor for command type: ${command.type}`)
      return
    }

    // Execute
    const result: CommandResult = await executor.execute(command, redis)

    if (result.status === 'success') {
      console.log(`[Quasar] ✅ Command executed: ${command.type} - ${result.message}`)
    } else {
      console.error(`[Quasar] ❌ Command failed: ${command.type} - ${result.message}`)
    }

    // Note: We don't publish the result back to Redis (async state observation).
    // The caller observes job state changes directly.
  }

  /**
   * Stop listening for commands.
   */
  async stop(): Promise<void> {
    if (!this.isListening) return

    try {
      await this.subscriber.unsubscribe()
      await this.subscriber.punsubscribe()
      this.isListening = false
      console.log('[Quasar] CommandListener stopped')
    } catch (err) {
      console.error('[Quasar] Error stopping CommandListener:', err)
    }
  }
}
