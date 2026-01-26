# 配置類型定義

本文檔記錄優化過程中新增或修改的配置類型定義。

## QueueManager 配置

### 優化後類型定義

```typescript
// 驅動配置類型
type DriverConfigMap = {
  memory: MemoryDriverConfig
  database: DatabaseDriverConfig
  redis: RedisDriverConfig
  kafka: KafkaDriverConfig
  sqs: SQSDriverConfig
  rabbitmq: RabbitMQDriverConfig
}

interface QueueConfig {
  default?: string
  defaultSerializer?: 'class' | 'json'
  connections?: Record<string, DriverConfigMap[keyof DriverConfigMap]>
  persistence?: PersistenceConfig
}

interface PersistenceConfig {
  adapter: PersistenceAdapter
  archiveCompleted?: boolean
  archiveFailed?: boolean
  archiveEnqueued?: boolean
  bufferSize?: number        // 新增：緩衝大小
  flushInterval?: number      // 新增：刷新間隔
  async?: boolean             // 新增：異步寫入
}
```

## Consumer 配置

### 優化後類型定義

```typescript
interface ConsumerOptions {
  queues: string[]
  connection?: string
  workerOptions?: WorkerOptions
  pollInterval?: number
  minPollInterval?: number    // 新增：最小輪詢間隔
  maxPollInterval?: number    // 新增：最大輪詢間隔
  backoffMultiplier?: number  // 新增：退避倍數
  keepAlive?: boolean
  concurrency?: number          // 新增：並發數
  batchSize?: number            // 新增：批量大小
  batchTimeout?: number         // 新增：批量超時
  monitor?: MonitorOptions
  rateLimits?: Record<string, RateLimit>
}
```

## Worker 配置

### 優化後類型定義

```typescript
interface WorkerOptions {
  maxAttempts?: number
  timeout?: number
  onFailed?: (job: Job, error: Error) => Promise<void>
  concurrency?: number  // 新增：並發數（用於 ConcurrentWorker）
}
```

## 驅動配置類型

### DatabaseDriverConfig

```typescript
interface DatabaseDriverConfig {
  driver: 'database'
  dbService: DatabaseService
  table: string
  connectionPool?: ConnectionPoolConfig  // 新增：連接池配置
}

interface ConnectionPoolConfig {
  min?: number
  max?: number
  idleTimeout?: number
}
```

### RedisDriverConfig

```typescript
interface RedisDriverConfig {
  driver: 'redis'
  client: RedisClient | IORedisClient
  prefix?: string
  usePipeline?: boolean  // 新增：是否使用 Pipeline
  batchSize?: number     // 新增：批量操作大小
}
```

## 序列化器配置

### 優化後類型定義

```typescript
interface SerializerConfig {
  type: 'class' | 'json' | 'msgpack'  // 新增：msgpack 選項
  cache?: boolean                       // 新增：是否啟用緩存
  cacheSize?: number                    // 新增：緩存大小
}
```
