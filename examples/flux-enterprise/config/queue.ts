const config = {
  driver: 'rabbitmq',
  url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  queue: process.env.RABBITMQ_QUEUE ?? 'orders.workflow',
  exchange: process.env.RABBITMQ_EXCHANGE ?? 'orders.workflow',
}

export default config
