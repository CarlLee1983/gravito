/**
 * Represents a job that has been serialized for storage in a queue.
 * @public
 */
export interface SerializedJob {
  /** Unique job identifier */
  id: string

  /** Serializer type: 'json' for plain objects or 'class' for instances */
  type: 'json' | 'class'

  /** Serialized data string */
  data: string

  /** Fully qualified class name (only used for 'class' type) */
  className?: string

  /** Timestamp when the job was created */
  createdAt: number

  /** Optional delay in seconds before the job becomes available for processing */
  delaySeconds?: number

  /** Number of times the job has been attempted */
  attempts?: number

  /** Maximum number of retry attempts before the job is marked as failed */
  maxAttempts?: number

  /** Group ID for FIFO (strictly sequential) processing */
  groupId?: string

  /** Initial delay in seconds before first retry attempt */
  retryAfterSeconds?: number

  /** Multiplier for exponential backoff on retries */
  retryMultiplier?: number

  /** Last error message if the job failed */
  error?: string

  /** Timestamp when the job finally failed after max attempts */
  failedAt?: number

  /** Optional priority for the job (string or numeric) */
  priority?: string | number
}

/**
 * Statistics for a single queue.
 * @public
 */
export interface QueueStats {
  /** Queue name */
  queue: string
  /** Number of pending jobs */
  size: number
  /** Number of delayed jobs (if supported) */
  delayed?: number
  /** Number of reserved/in-flight jobs (if supported) */
  reserved?: number
  /** Number of failed jobs in DLQ (if supported) */
  failed?: number
  /** Additional custom metrics */
  metrics?: Record<string, number>
}

/**
 * Advanced topic options for distributed queues (e.g., Kafka).
 * @public
 */
export interface TopicOptions {
  /** Number of partitions for the topic */
  partitions?: number
  /** Number of replicas for each partition */
  replicationFactor?: number
  /** Additional driver-specific configurations */
  config?: Record<string, string>
}

/**
 * PostgreSQL driver configuration.
 */
export interface DatabaseDriverConfig {
  driver: 'database'
  dbService: any // Still any until we have a proper DB service interface
  table?: string
}

/**
 * Redis driver configuration.
 */
export interface RedisDriverConfig {
  driver: 'redis'
  client: any // Will be improved in RedisDriver.ts
  prefix?: string
}

/**
 * Kafka driver configuration.
 */
export interface KafkaDriverConfig {
  driver: 'kafka'
  client: any
  consumerGroupId?: string
}

/**
 * SQS driver configuration.
 */
export interface SQSDriverConfig {
  driver: 'sqs'
  client: any
  queueUrlPrefix?: string
  visibilityTimeout?: number
  waitTimeSeconds?: number
}

/**
 * RabbitMQ driver configuration.
 */
export interface RabbitMQDriverConfig {
  driver: 'rabbitmq'
  client: any
  exchange?: string
  exchangeType?: string
}

/**
 * Configuration for a specific queue connection.
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
 * Queue manager config.
 */
export interface QueueConfig {
  /**
   * Default connection name.
   */
  default?: string

  /**
   * Connection configs.
   */
  connections?: Record<string, QueueConnectionConfig>

  /**
   * Default serializer type.
   */
  defaultSerializer?: 'json' | 'class'

  /**
   * Persistence configuration (SQL Archive).
   */
  persistence?: {
    /**
     * Persistence adapter instance or config.
     */
    adapter: PersistenceAdapter

    /**
     * Whether to automatically archive completed jobs.
     */
    archiveCompleted?: boolean

    /**
     * Whether to automatically archive failed jobs.
     */
    archiveFailed?: boolean

    /**
     * Whether to archive jobs immediately upon enqueue (Audit Mode).
     * @default false
     */
    archiveEnqueued?: boolean
  }
}

/**
 * Persistence Adapter Interface
 * Used for long-term archiving of jobs in a SQL database.
 */
export interface PersistenceAdapter {
  /**
   * Archive a job.
   */
  archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void>

  /**
   * Find a job in the archive.
   */
  find(queue: string, id: string): Promise<SerializedJob | null>

  /**
   * List jobs from the archive.
   */
  /**
   * List jobs from the archive.
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
   * Archive multiple jobs (batch write).
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
   */
  cleanup(days: number): Promise<number>

  /**
   * Flush any buffered data.
   */
  flush?(): Promise<void>

  /**
   * Count jobs in the archive.
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
   */
  archiveLog(log: {
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }): Promise<void>

  /**
   * Archive multiple log messages (batch write).
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
 * Options when pushing a job.
 */
export interface JobPushOptions {
  /**
   * Group ID for FIFO ordering (e.g. userId).
   * If set, jobs with the same groupId will be processed strictly sequentially.
   */
  groupId?: string

  /**
   * Job priority.
   * Higher priority jobs are processed first (if supported by driver).
   * Example: 'high', 'low', 'critical'
   */
  priority?: string | number
}
