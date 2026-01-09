/**
 * @gravito/stream
 *
 * Lightweight, high-performance queue system inspired by Laravel while keeping Gravito's core values.
 * Supports multiple storage drivers, embedded/standalone consumer modes, and multiple job serialization strategies.
 *
 * @example
 * ```typescript
 * import { OrbitStream, Job } from '@gravito/stream'
 *
 * // Create a Job
 * class SendEmail extends Job {
 *   async handle() {
 *     // handle logic
 *   }
 * }
 *
 * // Push a Job
 * await queue.push(new SendEmail())
 * ```
 */

export type { ConsumerOptions } from './Consumer'
export { Consumer } from './Consumer'
// Driver config types
export type { DatabaseDriverConfig } from './drivers/DatabaseDriver'
export { DatabaseDriver } from './drivers/DatabaseDriver'
export type { KafkaDriverConfig } from './drivers/KafkaDriver'
export { KafkaDriver } from './drivers/KafkaDriver'
export { MemoryDriver } from './drivers/MemoryDriver'
// Drivers
export type { QueueDriver } from './drivers/QueueDriver'
export type { RabbitMQDriverConfig } from './drivers/RabbitMQDriver'
export { RabbitMQDriver } from './drivers/RabbitMQDriver'
export type { RedisDriverConfig } from './drivers/RedisDriver'
export { RedisDriver } from './drivers/RedisDriver'
export type { SQSDriverConfig } from './drivers/SQSDriver'
export { SQSDriver } from './drivers/SQSDriver'

// Core classes
export { Job } from './Job'
export type { OrbitStreamOptions } from './OrbitStream'
export { OrbitStream } from './OrbitStream'
export { MySQLPersistence } from './persistence/MySQLPersistence'
export { SQLitePersistence } from './persistence/SQLitePersistence'
// Core interfaces & types
export type { Queueable } from './Queueable'
export { QueueManager } from './QueueManager'
export { Scheduler } from './Scheduler'
export { ClassNameSerializer } from './serializers/ClassNameSerializer'
// Serializers
export type { JobSerializer } from './serializers/JobSerializer'
export { JsonSerializer } from './serializers/JsonSerializer'
export type {
  PersistenceAdapter,
  QueueConfig,
  QueueConnectionConfig,
  SerializedJob,
  TopicOptions,
} from './types'
// Types
export type { WorkerOptions } from './Worker'
export { Worker } from './Worker'
