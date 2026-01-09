import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * RabbitMQ driver configuration.
 */
export interface RabbitMQDriverConfig {
  /**
   * RabbitMQ client (amqplib) Connection or Channel.
   * If a Connection is provided, the driver will create and manage a Channel.
   */
  client: any

  /**
   * Exchange name (optional).
   */
  exchange?: string

  /**
   * Exchange type (default: 'fanout').
   */
  exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout' | 'match'
}

/**
 * RabbitMQ Driver
 *
 * Uses RabbitMQ as the queue backend.
 * Implements FIFO via RabbitMQ Queues.
 *
 * Requires `amqplib`.
 *
 * @example
 * ```typescript
 * import amqp from 'amqplib'
 *
 * const connection = await amqp.connect('amqp://localhost')
 * const driver = new RabbitMQDriver({ client: connection })
 *
 * await driver.push('default', serializedJob)
 * ```
 */
export class RabbitMQDriver implements QueueDriver {
  private connection: any
  private channel: any
  private exchange?: string
  private exchangeType: string

  constructor(config: RabbitMQDriverConfig) {
    this.connection = config.client
    this.exchange = config.exchange
    this.exchangeType = config.exchangeType ?? 'fanout'

    if (!this.connection) {
      throw new Error(
        '[RabbitMQDriver] RabbitMQ connection is required. Please provide a connection from amqplib.'
      )
    }
  }

  /**
   * Ensure channel is created.
   */
  public async ensureChannel(): Promise<any> {
    if (this.channel) {
      return this.channel
    }

    // If client is a connection, create channel
    if (typeof this.connection.createChannel === 'function') {
      this.channel = await this.connection.createChannel()
    } else {
      // Assume client is already a channel
      this.channel = this.connection
    }

    if (this.exchange) {
      await this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true })
    }

    return this.channel
  }

  /**
   * Get the underlying connection.
   */
  public getRawConnection() {
    return this.connection
  }

  /**
   * Push a job (sendToQueue / publish).
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const channel = await this.ensureChannel()
    const payload = Buffer.from(JSON.stringify(job))

    if (this.exchange) {
      await channel.assertQueue(queue, { durable: true })
      await channel.bindQueue(queue, this.exchange, '')
      channel.publish(this.exchange, '', payload, { persistent: true })
    } else {
      await channel.assertQueue(queue, { durable: true })
      channel.sendToQueue(queue, payload, { persistent: true })
    }
  }

  /**
   * Pop a job (get).
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const channel = await this.ensureChannel()
    await channel.assertQueue(queue, { durable: true })
    const msg = await channel.get(queue, { noAck: false })
    if (!msg) {
      return null
    }

    const job = JSON.parse(msg.content.toString()) as SerializedJob
    // Attach raw message for acknowledgement if needed
    // Note: We use a Symbol or internal property to avoid leaking to serialization
    ;(job as any)._raw = msg

    return job
  }

  /**
   * Acknowledge a message.
   */
  async acknowledge(messageId: string): Promise<void> {
    // Note: RabbitMQ acks by message object, not ID in amqplib.
    // However, our QueueDriver interface uses messageId.
    // In our implementation, we'll expect the caller to pass the raw msg as messageId
    // or we might need to adjust the interface/implementation.
    // For now, if messageId is the raw message object:
    const channel = await this.ensureChannel()
    if (typeof messageId === 'object') {
      channel.ack(messageId)
    }
  }

  /**
   * Negative acknowledge a message.
   */
  async nack(message: any, requeue = true): Promise<void> {
    const channel = await this.ensureChannel()
    channel.nack(message, false, requeue)
  }

  /**
   * Reject a message.
   */
  async reject(message: any, requeue = true): Promise<void> {
    const channel = await this.ensureChannel()
    channel.reject(message, requeue)
  }

  /**
   * Subscribe to a queue.
   */
  async subscribe(
    queue: string,
    callback: (job: SerializedJob) => Promise<void>,
    options: { autoAck?: boolean } = {}
  ): Promise<void> {
    const channel = await this.ensureChannel()
    await channel.assertQueue(queue, { durable: true })

    if (this.exchange) {
      await channel.bindQueue(queue, this.exchange, '')
    }

    const { autoAck = true } = options

    await channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) {
          return
        }

        const job = JSON.parse(msg.content.toString()) as SerializedJob
        // Attach raw message for manual control
        ;(job as any)._raw = msg

        await callback(job)

        if (autoAck) {
          channel.ack(msg)
        }
      },
      { noAck: false }
    )
  }

  /**
   * Get queue size.
   */
  async size(queue: string): Promise<number> {
    const channel = await this.ensureChannel()
    const ok = await channel.checkQueue(queue)
    return ok.messageCount
  }

  /**
   * Clear a queue.
   */
  async clear(queue: string): Promise<void> {
    const channel = await this.ensureChannel()
    await channel.purgeQueue(queue)
  }
}
