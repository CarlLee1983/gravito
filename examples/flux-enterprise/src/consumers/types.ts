export interface BrokerConfig {
  queue: string
  exchange?: string
}

export interface BrokerMessage {
  content: string
  raw: any // Raw message from the broker (e.g., amqplib.ConsumeMessage)
}

export interface MessageBroker {
  connect(): Promise<void>
  subscribe(config: BrokerConfig, callback: (msg: BrokerMessage) => Promise<void>): Promise<void>
  ack(msg: BrokerMessage): Promise<void>
  nack(msg: BrokerMessage, requeue: boolean): Promise<void>
  reject(msg: BrokerMessage, requeue: boolean): Promise<void>
  close(): Promise<void>
}
