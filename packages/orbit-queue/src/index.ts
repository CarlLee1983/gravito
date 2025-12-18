/**
 * @gravito/orbit-queue
 *
 * 輕量、高效的隊列系統，借鑑 Laravel 架構但保持 Gravito 的核心價值。
 * 支援多種儲存驅動、內嵌與獨立 Consumer 模式，以及多種 Job 序列化方式。
 *
 * @example
 * ```typescript
 * import { OrbitQueue, Job } from '@gravito/orbit-queue'
 *
 * // 建立 Job
 * class SendEmail extends Job {
 *   async handle() {
 *     // 處理邏輯
 *   }
 * }
 *
 * // 推送 Job
 * await queue.push(new SendEmail())
 * ```
 */

export type { ConsumerOptions } from './Consumer'
export { Consumer } from './Consumer'
// 驅動配置型別
export type { DatabaseDriverConfig } from './drivers/DatabaseDriver'
export { DatabaseDriver } from './drivers/DatabaseDriver'
export type { KafkaDriverConfig } from './drivers/KafkaDriver'
export { KafkaDriver } from './drivers/KafkaDriver'
export { MemoryDriver } from './drivers/MemoryDriver'
// 驅動介面和實作
export type { QueueDriver } from './drivers/QueueDriver'
export type { RedisDriverConfig } from './drivers/RedisDriver'
export { RedisDriver } from './drivers/RedisDriver'
export type { SQSDriverConfig } from './drivers/SQSDriver'
export { SQSDriver } from './drivers/SQSDriver'

// 核心類別
export { Job } from './Job'
export type { OrbitQueueOptions } from './OrbitQueue'
export { OrbitQueue } from './OrbitQueue'
// 核心介面和型別
export type { Queueable } from './Queueable'
export { QueueManager } from './QueueManager'
export { ClassNameSerializer } from './serializers/ClassNameSerializer'
// 序列化器
export type { JobSerializer } from './serializers/JobSerializer'
export { JsonSerializer } from './serializers/JsonSerializer'
export type {
  QueueConfig,
  QueueConnectionConfig,
  SerializedJob,
  TopicOptions,
} from './types'
// 型別
export type { WorkerOptions } from './Worker'
export { Worker } from './Worker'
