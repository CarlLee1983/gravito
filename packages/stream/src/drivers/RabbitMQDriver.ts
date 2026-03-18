import type { SerializedJob } from '../types'
import { prepareJobForTransport } from './prepareJobForTransport'
import type { QueueDriver } from './QueueDriver'

interface RabbitMessage {
  content: Buffer
}

interface RabbitChannel {
  assertExchange(exchange: string, type: string, options: { durable: boolean }): Promise<unknown>
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<unknown>
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { persistent: boolean }
  ): boolean
  sendToQueue(queue: string, content: Buffer, options: { persistent: boolean }): boolean
  get(queue: string, options: { noAck: boolean }): Promise<RabbitMessage | false | null>
  ack(message: RabbitMessage): void
  nack(message: RabbitMessage, allUpTo: boolean, requeue: boolean): void
  reject(message: RabbitMessage, requeue: boolean): void
  consume(
    queue: string,
    onMessage: (message: RabbitMessage | null) => Promise<void>,
    options: { noAck: boolean }
  ): Promise<unknown>
  prefetch(count: number): Promise<unknown>
  checkQueue(queue: string): Promise<{ messageCount: number }>
  purgeQueue(queue: string): Promise<unknown>
}

interface RabbitConnection {
  createChannel(): Promise<RabbitChannel>
}

type RabbitClient = RabbitConnection | RabbitChannel

type RabbitQueuedJob = SerializedJob & { _raw?: RabbitMessage }

/**
 * RabbitMQ driver configuration.
 */
export interface RabbitMQDriverConfig {
  /**
   * RabbitMQ client (amqplib) Connection or Channel.
   * If a Connection is provided, the driver will create and manage a Channel.
   */
  client: RabbitClient

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
 * RabbitMQ (AMQP) queue driver.
 *
 * Uses RabbitMQ as the backend. Supports standard AMQP queues, exchanges,
 * and reliable message acknowledgements.
 *
 * @public
 * @example
 * ```typescript
 * import amqp from 'amqplib';
 * const conn = await amqp.connect('amqp://localhost');
 * const driver = new RabbitMQDriver({ client: conn });
 * ```
 */
export class RabbitMQDriver implements QueueDriver {
  private connection: RabbitClient
  private channel?: RabbitChannel
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

  private isRabbitConnection(client: RabbitClient): client is RabbitConnection {
    return typeof (client as RabbitConnection).createChannel === 'function'
  }

  /**
   * Ensure channel is created.
   */
  public async ensureChannel(): Promise<RabbitChannel> {
    if (this.channel) {
      return this.channel
    }

    // If client is a connection, create channel
    if (this.isRabbitConnection(this.connection)) {
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
   * Pushes a job to a RabbitMQ queue or exchange.
   *
   * @param queue - The queue name.
   * @param job - The serialized job.
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const channel = await this.ensureChannel()
    const jobForTransport = prepareJobForTransport(job)
    const payload = Buffer.from(JSON.stringify(jobForTransport))

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
   * Pops a job from the queue.
   *
   * @param queue - The queue name.
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const channel = await this.ensureChannel()
    await channel.assertQueue(queue, { durable: true })
    const msg = await channel.get(queue, { noAck: false })
    if (!msg) {
      return null
    }

    const job = JSON.parse(msg.content.toString()) as RabbitQueuedJob
    // Attach raw message for acknowledgement if needed
    // Note: We use a Symbol or internal property to avoid leaking to serialization
    job._raw = msg

    return job
  }

  /**
   * Pops multiple jobs.
   *
   * @param queue - The queue name.
   * @param count - Max jobs.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    const channel = await this.ensureChannel()
    await channel.assertQueue(queue, { durable: true })

    const results: SerializedJob[] = []

    // Attempt to get 'count' messages
    for (let i = 0; i < count; i++) {
      const msg = await channel.get(queue, { noAck: false })
      if (!msg) {
        break // Queue empty
      }

      const job = JSON.parse(msg.content.toString()) as RabbitQueuedJob
      job._raw = msg
      results.push(job)
    }

    return results
  }

  /**
   * Acknowledges a message.
   *
   * @param messageId - The message object (RabbitMQ requires object reference).
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
  async nack(message: RabbitMessage, requeue = true): Promise<void> {
    const channel = await this.ensureChannel()
    channel.nack(message, false, requeue)
  }

  /**
   * Reject a message.
   */
  async reject(message: RabbitMessage, requeue = true): Promise<void> {
    const channel = await this.ensureChannel()
    channel.reject(message, requeue)
  }

  /**
   * Subscribes to a queue.
   */
  async subscribe(
    queue: string,
    callback: (job: SerializedJob) => Promise<void>,
    options: { autoAck?: boolean; prefetch?: number } = {}
  ): Promise<void> {
    const channel = await this.ensureChannel()
    await channel.assertQueue(queue, { durable: true })

    if (options.prefetch) {
      await channel.prefetch(options.prefetch)
    }

    if (this.exchange) {
      await channel.bindQueue(queue, this.exchange, '')
    }

    const { autoAck = true } = options

    await channel.consume(
      queue,
      async (msg: RabbitMessage | null) => {
        if (!msg) {
          return
        }

        const job = JSON.parse(msg.content.toString()) as RabbitQueuedJob
        // Attach raw message for manual control
        job._raw = msg

        await callback(job)

        if (autoAck) {
          channel.ack(msg)
        }
      },
      { noAck: false }
    )
  }

  /**
   * Returns the number of messages in the queue.
   *
   * @param queue - The queue name.
   */
  async size(queue: string): Promise<number> {
    const channel = await this.ensureChannel()
    const ok = await channel.checkQueue(queue)
    return ok.messageCount
  }

  /**
   * Purges the queue.
   *
   * @param queue - The queue name.
   */
  async clear(queue: string): Promise<void> {
    const channel = await this.ensureChannel()
    await channel.purgeQueue(queue)
  }
}
