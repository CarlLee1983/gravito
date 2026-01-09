/**
 * Queue Configuration
 *
 * Defines queue connections and default queue driver.
 * This configuration is used by @gravito/stream queue system.
 *
 * Enterprise profile: Configured for production with Redis as default.
 */
export default {
  default: process.env.QUEUE_CONNECTION || 'redis',
  connections: {
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      prefix: process.env.REDIS_PREFIX || 'queue:',
    },
    database: {
      driver: 'database',
      table: process.env.QUEUE_TABLE || 'jobs',
    },
    kafka: {
      driver: 'kafka',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      consumerGroupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'gravito-workers',
      clientId: process.env.KAFKA_CLIENT_ID || 'gravito',
    },
  },
} as const
