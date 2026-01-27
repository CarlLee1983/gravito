import type { QueueProbe, QueueSnapshot } from './types'

export interface RabbitMQOptions {
  url: string
  username?: string
  password?: string
  vhost?: string
}

export class RabbitMQProbe implements QueueProbe {
  constructor(
    private options: RabbitMQOptions,
    private queueName: string
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const vhost = encodeURIComponent(this.options.vhost || '/')
    const queue = encodeURIComponent(this.queueName)
    const url = `${this.options.url}/api/queues/${vhost}/${queue}`

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (this.options.username && this.options.password) {
      const auth = btoa(`${this.options.username}:${this.options.password}`)
      headers.Authorization = `Basic ${auth}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`RabbitMQ API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as any

      return {
        name: this.queueName,
        driver: 'rabbitmq',
        size: {
          waiting: data.messages_ready || 0,
          active: data.messages_unacknowledged || 0,
          failed: 0, // RabbitMQ doesn't have a standard "failed" state like Bull
          delayed: 0,
        },
        throughput: {
          in: data.message_stats?.publish_details?.rate * 60 || 0,
          out: data.message_stats?.ack_details?.rate * 60 || 0,
        },
      }
    } catch (err) {
      console.warn(`[RabbitMQProbe] Failed to fetch metrics for ${this.queueName}`, err)
      return {
        name: this.queueName,
        driver: 'rabbitmq',
        size: { waiting: 0, active: 0, failed: 0, delayed: 0 },
      }
    }
  }
}
