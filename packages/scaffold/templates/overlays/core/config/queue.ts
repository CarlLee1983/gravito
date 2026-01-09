/**
 * Queue Configuration
 *
 * Defines queue connections and default queue driver.
 * This configuration is used by @gravito/stream queue system.
 *
 * Supported drivers: 'memory', 'database', 'redis', 'kafka', 'sqs', 'rabbitmq', 'nats'
 */
export default {
  default: process.env.QUEUE_CONNECTION || 'sync',
  connections: {
    sync: {
      driver: 'sync',
    },
    memory: {
      driver: 'memory',
    },
    database: {
      driver: 'database',
      table: process.env.QUEUE_TABLE || 'jobs',
    },
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      prefix: process.env.REDIS_PREFIX || 'queue:',
    },
  },
} as const
