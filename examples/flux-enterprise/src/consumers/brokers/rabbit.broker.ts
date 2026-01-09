import type { RabbitMQDriver } from '@gravito/stream'
import { getQueueManager } from '../../stream'
import type { BrokerConfig, BrokerMessage, MessageBroker } from '../types'

export class RabbitBroker implements MessageBroker {
  private driver?: RabbitMQDriver

  constructor(private url: string) {}

  async connect() {
    const manager = await getQueueManager()
    // In our project setup, the connection name is 'rabbitmq'
    this.driver = manager.getDriver('rabbitmq') as RabbitMQDriver
    await this.driver.ensureChannel()
  }

  async subscribe(config: BrokerConfig, callback: (msg: BrokerMessage) => Promise<void>) {
    if (!this.driver) throw new Error('Driver not initialized')

    const channel = await this.driver.ensureChannel()

    if (config.exchange) {
      await channel.assertExchange(config.exchange, 'fanout', { durable: true })
      await channel.assertQueue(config.queue, { durable: true })
      await channel.bindQueue(config.queue, config.exchange, '')
    } else {
      await channel.assertQueue(config.queue, { durable: true })
    }

    await channel.consume(
      config.queue,
      async (rawMsg: any) => {
        if (!rawMsg) return

        await callback({
          content: rawMsg.content.toString(),
          raw: rawMsg,
        })
      },
      { noAck: false }
    )
  }

  async ack(msg: BrokerMessage) {
    if (!this.driver) return
    await this.driver.acknowledge(msg.raw)
  }

  async nack(msg: BrokerMessage, requeue: boolean) {
    if (!this.driver) return
    await this.driver.nack(msg.raw, requeue)
  }

  async reject(msg: BrokerMessage, requeue: boolean) {
    if (!this.driver) return
    await this.driver.reject(msg.raw, requeue)
  }

  async close() {
    // Note: Connection closing might be handled externally by QueueManager
    // but we can close the channel via the driver
    const channel = await this.driver?.ensureChannel()
    await channel?.close()
  }
}
