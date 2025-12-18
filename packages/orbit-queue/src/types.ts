/**
 * 序列化後的 Job 資料結構
 */
export interface SerializedJob {
  /**
   * Job 的唯一識別碼
   */
  id: string

  /**
   * 序列化類型：'json' 或 'class'
   */
  type: 'json' | 'class'

  /**
   * 序列化後的資料
   */
  data: string

  /**
   * 類別名稱（僅當 type === 'class' 時使用）
   */
  className?: string

  /**
   * 建立時間戳
   */
  createdAt: number

  /**
   * 延遲執行時間（秒）
   */
  delaySeconds?: number

  /**
   * 重試次數
   */
  attempts?: number

  /**
   * 最大重試次數
   */
  maxAttempts?: number
}

/**
 * Topic 選項（用於 Kafka 等）
 */
export interface TopicOptions {
  /**
   * 分區數量
   */
  partitions?: number

  /**
   * 複製因子
   */
  replicationFactor?: number

  /**
   * 其他配置
   */
  config?: Record<string, string>
}

/**
 * Queue 連接配置
 */
export interface QueueConnectionConfig {
  /**
   * 驅動類型
   */
  driver: 'memory' | 'database' | 'redis' | 'kafka' | 'sqs' | 'rabbitmq' | 'nats'

  /**
   * 驅動特定配置
   */
  [key: string]: unknown
}

/**
 * Queue 管理器配置
 */
export interface QueueConfig {
  /**
   * 預設連接名稱
   */
  default?: string

  /**
   * 連接配置
   */
  connections?: Record<string, QueueConnectionConfig>

  /**
   * 預設序列化器類型
   */
  defaultSerializer?: 'json' | 'class'
}
