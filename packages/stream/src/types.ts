/**
 * Serialized job payload.
 */
export interface SerializedJob {
  /**
   * Unique job identifier.
   */
  id: string

  /**
   * Serializer type: `'json'` or `'class'`.
   */
  type: 'json' | 'class'

  /**
   * Serialized data.
   */
  data: string

  /**
   * Class name (only for `type === 'class'`).
   */
  className?: string

  /**
   * Created timestamp.
   */
  createdAt: number

  /**
   * Delay before execution (seconds).
   */
  delaySeconds?: number

  /**
   * Current attempt number.
   */
  attempts?: number

  /**
   * Maximum attempts.
   */
  maxAttempts?: number

  /**
   * Group ID for FIFO ordering.
   */
  groupId?: string

  /**
   * Initial retry delay (seconds).
   */
  retryAfterSeconds?: number

  /**
   * Retry delay multiplier.
   */
  retryMultiplier?: number

  /**
   * Last error message.
   */
  error?: string

  /**
   * Timestamp when the job failed permanently.
   */
  failedAt?: number

  /**
   * Job priority.
   */
  priority?: string | number
}

/**
 * Topic options (for Kafka, etc.).
 */
export interface TopicOptions {
  /**
   * Number of partitions.
   */
  partitions?: number

  /**
   * Replication factor.
   */
  replicationFactor?: number

  /**
   * Additional config.
   */
  config?: Record<string, string>
}

/**
 * Queue connection config.
 */
export interface QueueConnectionConfig {
  /**
   * Driver type.
   */
  driver: 'memory' | 'database' | 'redis' | 'kafka' | 'sqs' | 'rabbitmq' | 'nats'

  /**
   * Driver-specific config.
   */
  [key: string]: unknown
}

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
   * Remove old data from the archive.
   */
  cleanup(days: number): Promise<number>

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
