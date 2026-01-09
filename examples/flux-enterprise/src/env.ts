import { resolve } from 'node:path'
import { env as processEnv } from 'node:process'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env'), override: false })

const getString = (key: string, fallback: string) => processEnv[key] ?? fallback
const getNumber = (key: string, fallback: number) => {
  const value = processEnv[key]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

export const env = {
  port: getNumber('PORT', 4002),
  appName: getString('APP_NAME', 'Flux Enterprise Demo'),
  databaseUrl: getString('DATABASE_URL', 'sqlite:./flux-enterprise.db'),
  redisUrl: getString('REDIS_URL', 'redis://localhost:6379'),
  rabbitUrl: getString('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  rabbitUser: getString('RABBITMQ_USER', 'guest'),
  rabbitPass: getString('RABBITMQ_PASS', 'guest'),
  rabbitExchange: getString('RABBITMQ_EXCHANGE', 'orders.workflow'),
  rabbitQueue: getString('RABBITMQ_QUEUE', 'orders.workflow'),
  tracePath: getString('TRACE_PATH', '.flux-enterprise/trace.ndjson'),
  queueDriver: getString('QUEUE_DRIVER', 'rabbitmq'),
}
