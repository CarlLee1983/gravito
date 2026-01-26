/**
 * Represents a job that has been serialized for storage in a queue.
 *
 * This interface defines the data structure used to persist jobs in the underlying
 * storage mechanism (e.g., Redis, Database, SQS). It encapsulates all metadata
 * required for processing, retries, and lifecycle management.
 *
 * @public
 * @example
 * ```typescript
 * const job: SerializedJob = {
 *   id: 'job-123',
 *   type: 'json',
 *   data: '{"userId": 1}',
 *   createdAt: Date.now()
 * };
 * ```
 */
export interface SerializedJob {
  /**
   * Unique identifier for the job.
   */
  id: string

  /**
   * The serialization format used for the job data.
   *
   * - 'json': Simple JSON objects.
   * - 'class': Serialized class instances (requires class registration).
   * - 'msgpack': Binary MessagePack format.
   */
  type: 'json' | 'class' | 'msgpack'

  /**
   * The actual serialized job payload.
   *
   * Contains the business data needed to execute the job.
   */
  data: string

  /**
   * The fully qualified class name of the job.
   *
   * Only required when `type` is 'class' to reconstruct the original object instance.
   */
  className?: string

  /**
   * The timestamp (in milliseconds) when the job was originally created.
   */
  createdAt: number

  /**
   * Optional delay in seconds before the job becomes eligible for processing.
   *
   * Used for scheduling future tasks.
   */
  delaySeconds?: number

  /**
   * The number of times this job has been attempted so far.
   */
  attempts?: number

  /**
   * The maximum number of retry attempts allowed before marking the job as failed.
   */
  maxAttempts?: number

  /**
   * Group ID for sequential processing.
   *
   * Jobs sharing the same `groupId` are guaranteed to be processed in order (FIFO),
   * provided the consumer supports this feature.
   */
  groupId?: string

  /**
   * The initial delay in seconds before the first retry attempt after a failure.
   */
  retryAfterSeconds?: number

  /**
   * The multiplier applied to the delay for exponential backoff strategies.
   */
  retryMultiplier?: number

  /**
   * The error message from the last failed attempt, if any.
   */
  error?: string

  /**
   * The timestamp (in milliseconds) when the job was permanently marked as failed.
   */
  failedAt?: number

  /**
   * The priority level of the job.
   *
   * Higher values or specific strings (e.g., 'high') indicate higher priority.
   */
  priority?: string | number
}

/**
 * Represents a database record for an archived job.
 *
 * This interface maps to the SQL table structure used for job persistence and auditing.
 * It stores historical data about jobs that have been completed or failed.
 *
 * @example
 * ```typescript
 * const row: JobRow = {
 *   id: 1,
 *   job_id: 'job-123',
 *   queue: 'default',
 *   status: 'completed',
 *   payload: '...',
 *   created_at: new Date(),
 *   archived_at: new Date()
 * };
 * ```
 */
export interface JobRow {
  /** Primary key of the record */
  id: number
  /** The original job ID */
  job_id: string
  /** The queue name the job belonged to */
  queue: string
  /** Final status of the job (e.g., 'completed', 'failed') */
  status: string
  /** Serialized job data */
  payload: string
  /** Error message if the job failed */
  error?: string | null
  /** When the job was created */
  created_at: Date
  /** When the job was archived */
  archived_at: Date
}

/**
 * Statistics snapshot for a specific queue.
 *
 * Provides insight into the current state of a queue, including pending,
 * delayed, reserved, and failed job counts.
 *
 * @public
 * @example
 * ```typescript
 * const stats: QueueStats = {
 *   queue: 'default',
 *   size: 42,
 *   delayed: 5,
 *   failed: 1
 * };
 * ```
 */
export interface QueueStats {
  /** Name of the queue */
  queue: string
  /** Number of pending jobs waiting to be processed */
  size: number
  /** Number of jobs scheduled for future execution */
  delayed?: number
  /** Number of jobs currently being processed by workers */
  reserved?: number
  /** Number of jobs in the Dead Letter Queue (DLQ) */
  failed?: number
  /** Driver-specific custom metrics */
  metrics?: Record<string, number>
}

/**
 * Advanced topic configuration options for distributed queue systems.
 *
 * Used primarily by drivers like Kafka to configure topic properties.
 *
 * @public
 * @example
 * ```typescript
 * const options: TopicOptions = {
 *   partitions: 3,
 *   replicationFactor: 2
 * };
 * ```
 */
export interface TopicOptions {
  /** Number of partitions for the topic */
  partitions?: number
  /** Replication factor for fault tolerance */
  replicationFactor?: number
  /** Additional driver-specific configuration key-values */
  config?: Record<string, string>
}

/**
 * Configuration for the Database driver.
 *
 * Configures the queue system to use a SQL database for job storage.
 *
 * @public
 * @example
 * ```typescript
 * const config: DatabaseDriverConfig = {
 *   driver: 'database',
 *   dbService: myDbService,
 *   table: 'my_jobs'
 * };
 * ```
 */
export interface DatabaseDriverConfig {
  /** Driver type identifier */
  driver: 'database'
  /** Database service implementation for executing queries */
  dbService: any
  /** Optional custom table name for storing jobs */
  table?: string
}

/**
 * Configuration for the Redis driver.
 *
 * Configures the queue system to use Redis for high-performance job storage.
 *
 * @public
 * @example
 * ```typescript
 * const config: RedisDriverConfig = {
 *   driver: 'redis',
 *   client: redisClient,
 *   prefix: 'my-app:queue:'
 * };
 * ```
 */
export interface RedisDriverConfig {
  /** Driver type identifier */
  driver: 'redis'
  /** Redis client instance (ioredis or node-redis compatible) */
  client: any
  /** Optional key prefix for namespacing */
  prefix?: string
}

/**
 * Configuration for the Kafka driver.
 *
 * Configures the queue system to use Apache Kafka.
 *
 * @example
 * ```typescript
 * const config: KafkaDriverConfig = {
 *   driver: 'kafka',
 *   client: kafkaClient,
 *   consumerGroupId: 'my-group'
 * };
 * ```
 */
export interface KafkaDriverConfig {
  /** Driver type identifier */
  driver: 'kafka'
  /** Kafka client instance */
  client: any
  /** Consumer group ID for coordinating workers */
  consumerGroupId?: string
}

/**
 * Configuration for the SQS driver.
 *
 * Configures the queue system to use Amazon Simple Queue Service.
 *
 * @public
 * @example
 * ```typescript
 * const config: SQSDriverConfig = {
 *   driver: 'sqs',
 *   client: sqsClient,
 *   queueUrlPrefix: 'https://sqs.us-east-1.amazonaws.com/123/'
 * };
 * ```
 */
export interface SQSDriverConfig {
  /** Driver type identifier */
  driver: 'sqs'
  /** Amazon SQS client instance */
  client: any
  /** Optional prefix for resolving queue names to URLs */
  queueUrlPrefix?: string
  /** The duration (in seconds) that received messages are hidden from other consumers */
  visibilityTimeout?: number
  /** The duration (in seconds) to wait for a message (Long Polling) */
  waitTimeSeconds?: number
}

/**
 * Configuration for the RabbitMQ driver.
 *
 * Configures the queue system to use RabbitMQ (AMQP).
 *
 * @example
 * ```typescript
 * const config: RabbitMQDriverConfig = {
 *   driver: 'rabbitmq',
 *   client: amqpConnection,
 *   exchange: 'jobs',
 *   exchangeType: 'direct'
 * };
 * ```
 */
export interface RabbitMQDriverConfig {
  /** Driver type identifier */
  driver: 'rabbitmq'
  /** AMQP client instance */
  client: any
  /** Exchange name to publish to */
  exchange?: string
  /** Type of exchange (direct, topic, fanout, headers) */
  exchangeType?: string
}

/**
 * Union type for all supported queue connection configurations.
 *
 * @public
 */
export type QueueConnectionConfig =
  | { driver: 'memory' }
  | DatabaseDriverConfig
  | RedisDriverConfig
  | KafkaDriverConfig
  | SQSDriverConfig
  | RabbitMQDriverConfig
  | { driver: 'nats'; [key: string]: unknown }
  | { driver: string; [key: string]: unknown }

/**
 * Global configuration for the QueueManager.
 *
 * Defines available connections, serialization settings, and system-wide behaviors.
 *
 * @example
 * ```typescript
 * const config: QueueConfig = {
 *   default: 'redis',
 *   connections: {
 *     redis: { driver: 'redis', client: redis }
 *   },
 *   debug: true
 * };
 * ```
 */
export interface QueueConfig {
  /**
   * The name of the default connection to use when none is specified.
   */
  default?: string

  /**
   * Map of connection names to their configurations.
   */
  connections?: Record<string, QueueConnectionConfig>

  /**
   * The default serialization format to use for jobs.
   */
  defaultSerializer?: 'json' | 'class' | 'msgpack'

  /**
   * Whether to cache serialized job data.
   *
   * If true, re-queuing the same Job instance will reuse the cached serialized string,
   * improving performance for frequently pushed jobs.
   *
   * @default false
   */
  useSerializationCache?: boolean

  /**
   * Enable verbose debug logging.
   *
   * Useful for troubleshooting queue operations and consumer behavior.
   *
   * @default false
   */
  debug?: boolean

  /**
   * Configuration for the persistence layer (SQL Archive).
   */
  persistence?: {
    /**
     * The persistence adapter instance used to store archived jobs.
     */
    adapter: PersistenceAdapter

    /**
     * Whether to automatically archive jobs upon successful completion.
     */
    archiveCompleted?: boolean

    /**
     * Whether to automatically archive jobs upon permanent failure.
     */
    archiveFailed?: boolean

    /**
     * Whether to archive jobs immediately when they are enqueued (Audit Mode).
     *
     * @default false
     */
    archiveEnqueued?: boolean

    /**
     * Buffer size for batched writes to the archive.
     *
     * If set, wraps the adapter in a `BufferedPersistence` decorator to improve throughput.
     */
    bufferSize?: number

    /**
     * Maximum time (in milliseconds) to wait before flushing the write buffer.
     */
    flushInterval?: number
  }
}

/**
 * Interface for persistence adapters.
 *
 * Defines the contract for storing long-term history of jobs in a permanent storage
 * (typically a SQL database).
 *
 * @example
 * ```typescript
 * class MyPersistence implements PersistenceAdapter {
 *   async archive(queue, job, status) { ... }
 *   // ...
 * }
 * ```
 */
export interface PersistenceAdapter {
  /**
   * Archive a single job.
   *
   * @param queue - The name of the queue.
   * @param job - The serialized job data.
   * @param status - The final status of the job ('completed', 'failed', etc.).
   * @returns A promise that resolves when the job is archived.
   */
  archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void>

  /**
   * Find a specific job in the archive.
   *
   * @param queue - The name of the queue.
   * @param id - The job ID.
   * @returns The serialized job if found, or null.
   */
  find(queue: string, id: string): Promise<SerializedJob | null>

  /**
   * List jobs from the archive based on criteria.
   *
   * @param queue - The name of the queue.
   * @param options - Filtering and pagination options.
   * @returns A list of matching serialized jobs.
   */
  list(
    queue: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<SerializedJob[]>

  /**
   * Archive multiple jobs in a single batch operation.
   *
   * @param jobs - Array of job data to archive.
   * @returns A promise that resolves when all jobs are archived.
   */
  archiveMany?(
    jobs: Array<{
      queue: string
      job: SerializedJob
      status: 'completed' | 'failed' | 'waiting' | string
    }>
  ): Promise<void>

  /**
   * Remove old data from the archive.
   *
   * @param days - Retention period in days; older records will be deleted.
   * @returns The number of records deleted.
   */
  cleanup(days: number): Promise<number>

  /**
   * Flush any buffered data to storage.
   *
   * @returns A promise that resolves when the flush is complete.
   */
  flush?(): Promise<void>

  /**
   * Count jobs in the archive matching specific criteria.
   *
   * @param queue - The name of the queue.
   * @param options - Filtering options.
   * @returns The total count of matching jobs.
   */
  count(
    queue: string,
    options?: {
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<number>

  /**
   * Archive a system log message.
   *
   * @param log - The log entry to archive.
   * @returns A promise that resolves when the log is archived.
   */
  archiveLog(log: {
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }): Promise<void>

  /**
   * Archive multiple log messages in a batch.
   *
   * @param logs - Array of log entries to archive.
   * @returns A promise that resolves when logs are archived.
   */
  archiveLogMany?(
    logs: Array<{
      level: string
      message: string
      workerId: string
      queue?: string
      timestamp: Date
    }>
  ): Promise<void>

  /**
   * List system logs from the archive.
   *
   * @param options - Filtering and pagination options.
   * @returns A list of matching log entries.
   */
  listLogs(options?: {
    limit?: number
    offset?: number
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<any[]>

  /**
   * Count system logs in the archive.
   *
   * @param options - Filtering options.
   * @returns The total count of matching logs.
   */
  countLogs(options?: {
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<number>
}

/**
 * Options used when pushing a job to the queue.
 *
 * Allows customizing delivery behavior, such as delays, priority, and ordering.
 *
 * @example
 * ```typescript
 * const options: JobPushOptions = {
 *   priority: 'high',
 *   groupId: 'user-123'
 * };
 * ```
 */
export interface JobPushOptions {
  /**
   * Group ID for FIFO ordering.
   *
   * If provided, jobs with the same `groupId` are guaranteed to be processed strictly
   * sequentially. This is useful for event streams where order matters (e.g., per-user events).
   */
  groupId?: string

  /**
   * Job priority level.
   *
   * Higher priority jobs are processed before lower priority ones, depending on driver support.
   * Common values: 'critical', 'high', 'default', 'low'.
   */
  priority?: string | number
}
