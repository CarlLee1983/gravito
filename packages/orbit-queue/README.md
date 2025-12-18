# @gravito/orbit-queue

輕量、高效的隊列系統，借鑑 Laravel 架構但保持 Gravito 的核心價值（高效能、低耗、輕量、AI 友善）。支援多種儲存驅動、內嵌與獨立 Consumer 模式，以及多種 Job 序列化方式。

> **狀態**：v0.1.0 - 核心功能已完成，支援 Memory、Database、Redis、Kafka、SQS 驅動

## 特性

- **零運行時開銷**：純型別包裝，直接委派給驅動
- **多驅動支援**：Memory、Database、Redis、Kafka、SQS 等
- **完全模組化**：按需安裝驅動，核心包極小（< 50KB）
- **內嵌與獨立模式**：開發時內嵌運行，生產環境可獨立部署
- **AI 友善**：完整的型別推導、清晰的 JSDoc、直觀的 API

## 安裝

```bash
bun add @gravito/orbit-queue
```

## 快速開始

### 1. 建立 Job

```typescript
import { Job } from '@gravito/orbit-queue'

export class SendWelcomeEmail extends Job {
  constructor(private userId: string) {
    super()
  }

  async handle(): Promise<void> {
    // 處理邏輯
    const user = await User.find(this.userId)
    await mail.send(new WelcomeEmail(user))
  }
}
```

### 2. 推送 Job

```typescript
// 在 Controller 中
const queue = c.get('queue')

await queue.push(new SendWelcomeEmail(user.id))
  .onQueue('emails')
  .delay(60) // 延遲 60 秒
```

### 3. 配置 OrbitQueue

#### 使用 Memory Driver（開發用）

```typescript
import { OrbitQueue } from '@gravito/orbit-queue'

const core = await PlanetCore.boot({
  orbits: [
    OrbitQueue.configure({
      default: 'memory',
      connections: {
        memory: { driver: 'memory' }
      },
      autoStartWorker: true,
      workerOptions: {
        queues: ['default', 'emails']
      }
    })
  ]
})
```

#### 使用 Database Driver

```typescript
import { OrbitQueue } from '@gravito/orbit-queue'
import { OrbitDB } from '@gravito/orbit-db'

const core = await PlanetCore.boot({
  orbits: [
    OrbitDB.configure({ db: drizzleClient }),
    OrbitQueue.configure({
      default: 'database',
      connections: {
        database: { 
          driver: 'database',
          table: 'jobs' // 可選，預設為 'jobs'
          // dbService 會自動從 Context 取得（如果 OrbitDB 已安裝）
        }
      }
    })
  ]
})
```

#### 使用 Redis Driver

```typescript
import { OrbitQueue } from '@gravito/orbit-queue'
import Redis from 'ioredis'

const redis = new Redis('redis://localhost:6379')

const core = await PlanetCore.boot({
  orbits: [
    OrbitQueue.configure({
      default: 'redis',
      connections: {
        redis: { 
          driver: 'redis',
          client: redis,
          prefix: 'queue:' // 可選
        }
      }
    })
  ]
})
```

#### 使用 Kafka Driver

```typescript
import { OrbitQueue } from '@gravito/orbit-queue'
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  brokers: ['localhost:9092'],
  clientId: 'gravito-app'
})

const core = await PlanetCore.boot({
  orbits: [
    OrbitQueue.configure({
      default: 'kafka',
      connections: {
        kafka: { 
          driver: 'kafka',
          client: kafka,
          consumerGroupId: 'gravito-workers'
        }
      }
    })
  ]
})
```

#### 使用 SQS Driver

```typescript
import { OrbitQueue } from '@gravito/orbit-queue'
import { SQSClient } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

const core = await PlanetCore.boot({
  orbits: [
    OrbitQueue.configure({
      default: 'sqs',
      connections: {
        sqs: { 
          driver: 'sqs',
          client: sqs,
          queueUrlPrefix: 'https://sqs.us-east-1.amazonaws.com/123456789012', // 可選
          visibilityTimeout: 30, // 可選
          waitTimeSeconds: 20 // 可選，長輪詢
        }
      }
    })
  ]
})
```

## 資料庫 Schema

如果使用 Database Driver，需要建立以下資料表：

```sql
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  queue VARCHAR(255) NOT NULL,
  payload TEXT NOT NULL,
  attempts INT DEFAULT 0,
  reserved_at TIMESTAMP,
  available_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_queue_available ON jobs(queue, available_at);
CREATE INDEX idx_jobs_reserved ON jobs(reserved_at);
```

## 獨立 Consumer（微服務模式）

```bash
# 使用 Database
bun run packages/orbit-queue/cli/queue-worker.ts \
  --connection=database \
  --queues=default,emails \
  --workers=4

# 使用 Kafka
bun run packages/orbit-queue/cli/queue-worker.ts \
  --connection=kafka \
  --queues=default,emails \
  --consumer-group=gravito-workers

# 使用 SQS
bun run packages/orbit-queue/cli/queue-worker.ts \
  --connection=sqs \
  --queues=default,emails \
  --region=us-east-1
```

## API 參考

### Job

```typescript
abstract class Job implements Queueable {
  abstract handle(): Promise<void>
  async failed(error: Error): Promise<void>
  
  onQueue(queue: string): this
  onConnection(connection: string): this
  delay(seconds: number): this
}
```

### QueueManager

```typescript
class QueueManager {
  async push<T extends Job>(job: T): Promise<T>
  async pushMany<T extends Job>(jobs: T[]): Promise<void>
  async pop(queue?: string, connection?: string): Promise<Job | null>
  async size(queue?: string, connection?: string): Promise<number>
  async clear(queue?: string, connection?: string): Promise<void>
  registerJobClasses(jobClasses: Array<new (...args: unknown[]) => Job>): void
}
```

## 設計原則

- **高效能**：零運行時開銷，直接委派給驅動，支援批量操作
- **低耗**：最小化依賴，重用現有連接（DatabaseDriver 重用 orbit-db）
- **輕量**：核心包極小（< 50KB），驅動完全模組化，按需載入
- **AI 友善**：完整的型別推導，清晰的 JSDoc，直觀的 API

## 已實作的驅動

### 基礎驅動

- ✅ **MemoryDriver** - 記憶體驅動（開發用，零配置）
- ✅ **DatabaseDriver** - 資料庫驅動（PostgreSQL、MySQL、SQLite）
- ✅ **RedisDriver** - Redis 驅動（支援延遲執行）

### 企業級 Broker 驅動

- ✅ **KafkaDriver** - Apache Kafka 驅動（支援 Topic、Consumer Groups）
- ✅ **SQSDriver** - AWS SQS 驅動（支援標準/FIFO 隊列、長輪詢）

## 未來規劃

以下 broker 驅動計劃在後續版本中實作：

### 計劃中的驅動

- 🔜 **RabbitMQDriver** - RabbitMQ 驅動
  - 支援 Exchange 和 Queue 管理
  - 支援多種 Exchange 類型（direct、topic、fanout、headers）
  - 支援持久化隊列
  - 支援確認機制

- 🔜 **NATSDriver** - NATS 驅動
  - 支援 JetStream（持久化消息）
  - 支援訂閱模式
  - 支援請求/回應模式

- 🔜 **GooglePubSubDriver** - Google Cloud Pub/Sub 驅動
  - 支援 Topic 和 Subscription 管理
  - 支援批量操作
  - 支援死信主題（Dead Letter Topic）

- 🔜 **AzureServiceBusDriver** - Azure Service Bus 驅動
  - 支援 Queue 和 Topic 管理
  - 支援會話（Sessions）
  - 支援死信隊列

- 🔜 **BeanstalkdDriver** - Beanstalkd 驅動
  - 輕量級消息隊列
  - 支援優先級和延遲
  - 支援 TTR（Time To Run）

### 貢獻指南

如果您想為 Gravito Queue 添加新的 broker 驅動，請：

1. 實作 `QueueDriver` 介面
2. 確保符合核心原則（高效能、低耗、輕量、AI 友善）
3. 添加完整的 JSDoc 註解
4. 添加單元測試
5. 更新 README 文件

## 相關文件

- [ROADMAP.md](./ROADMAP.md) - 詳細的路線圖和計劃
- [MIGRATION.md](./MIGRATION.md) - 資料庫遷移腳本

## 授權

MIT
