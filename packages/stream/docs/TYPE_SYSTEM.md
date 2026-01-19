# @gravito/stream 類型系統架構

> **版本**: 3.0.0  
> **最後更新**: 2026-01-19  
> **狀態**: ✅ 穩定

## 📋 目錄

1. [概述](#概述)
2. [核心類型](#核心類型)
3. [驅動配置類型](#驅動配置類型)
4. [客戶端類型相容層](#客戶端類型相容層)
5. [泛型使用](#泛型使用)
6. [類型守衛](#類型守衛type-guards)
7. [內部類型](#內部類型)
8. [最佳實踐](#最佳實踐)
9. [常見問題](#常見問題)

---

## 概述

`@gravito/stream` 採用了嚴格的類型系統設計，確保在編譯時捕獲大部分錯誤，同時保持對多種驅動和客戶端的相容性。

### 設計原則

1. **漸進式類型化**: 公共 API 完全類型化，內部實作允許適度彈性
2. **驅動無關性**: 核心類型不依賴特定驅動實作
3. **向後相容**: 類型變更不破壞現有使用者代碼
4. **文檔驅動**: 所有公共類型都有 JSDoc 註解

### 類型安全等級

| 層級 | 模組 | 類型覆蓋率 | 嚴格模式 |
|------|------|-----------|---------|
| **Public API** | Job, QueueManager, Consumer | 100% | ✅ |
| **Drivers** | Memory, Database, Redis | 95% | ✅ |
| **Persistence** | MySQL, SQLite | 98% | ✅ |
| **Internal** | Serializer, Utils | 90% | ✅ |

---

## 核心類型

### SerializedJob

序列化後的任務結構，用於跨系統傳輸和儲存。

```typescript
export interface SerializedJob {
  /** 唯一任務識別碼 */
  id: string

  /** 序列化類型: 'json' 用於普通對象, 'class' 用於類實例 */
  type: 'json' | 'class'

  /** 序列化的數據字串 */
  data: string

  /** 完整的類別名稱 (僅用於 'class' 類型) */
  className?: string

  /** 任務創建時的時間戳 */
  createdAt: number

  /** 可選的延遲秒數 */
  delaySeconds?: number

  /** 重試次數 */
  attempts?: number

  /** 最大重試次數 */
  maxAttempts?: number

  /** FIFO 群組 ID */
  groupId?: string

  /** 首次重試前的延遲秒數 */
  retryAfterSeconds?: number

  /** 指數退避的乘數 */
  retryMultiplier?: number

  /** 最後的錯誤訊息 */
  error?: string

  /** 任務最終失敗的時間戳 */
  failedAt?: number

  /** 優先級 */
  priority?: string | number
}
```

**應用場景**:
- ✅ 驅動間傳遞任務
- ✅ 持久化儲存
- ✅ 序列化/反序列化
- ❌ 不用於業務邏輯（應使用 `Job` 類）

---

### PersistenceAdapter

SQL 歸檔的介面定義。

```typescript
export interface PersistenceAdapter {
  /** 歸檔單個任務 */
  archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void>

  /** 查找歸檔任務 */
  find(queue: string, id: string): Promise<SerializedJob | null>

  /** 列出歸檔任務 */
  list(queue: string, options?: ListOptions): Promise<SerializedJob[]>

  /** 批次歸檔（可選）*/
  archiveMany?(jobs: ArchiveJob[]): Promise<void>

  /** 清理舊數據 */
  cleanup(days: number): Promise<number>

  /** 刷新緩衝數據 */
  flush?(): Promise<void>

  /** 計數歸檔任務 */
  count(queue: string, options?: CountOptions): Promise<number>

  /** 歸檔系統日誌 */
  archiveLog(log: LogMessage): Promise<void>

  /** 批次歸檔日誌（可選）*/
  archiveLogMany?(logs: LogMessage[]): Promise<void>

  /** 列出系統日誌 */
  listLogs(options?: ListLogsOptions): Promise<any[]>

  /** 計數系統日誌 */
  countLogs(options?: CountLogsOptions): Promise<number>
}
```

**實作**:
- `MySQLPersistence`: MySQL/MariaDB 歸檔
- `SQLitePersistence`: SQLite 歸檔（零配置）

---

##驅動配置類型

### QueueConnectionConfig

聯合類型，支援所有驅動配置。

```typescript
export type QueueConnectionConfig =
  | { driver: 'memory' }
  | DatabaseDriverConfig
  | RedisDriverConfig
  | KafkaDriverConfig
  | SQSDriverConfig
  | RabbitMQDriverConfig
  | { driver: 'nats'; [key: string]: unknown }
  | { driver: string; [key: string]: unknown }
```

**特點**:
- ✅ 類型判斷支援（透過 `driver` 屬性）
- ✅ 可擴展（最後兩個是 fallback）
- ✅ 自動完成友好

---

### DatabaseDriverConfig

資料庫驅動配置。

```typescript
export interface DatabaseDriverConfig {
  driver: 'database'
  
  /** 資料庫服務實作 */
  dbService: DatabaseService
  
  /** 可選的表格名稱 */
  table?: string
}

export interface DatabaseService {
  /** 執行 SQL 查詢 */
  execute<T = any>(query: string, params?: any[]): Promise<T[]>
  
  /** 執行原始 SQL（可選）*/
  executeRaw?<T = any>(query: string, params?: any[]): Promise<T>
  
  /** 允許額外屬性（適配器模式）*/
  [key: string]: any
}
```

**設計說明**:
- `DatabaseService` 使用 `any` 是**正當化**的：
  - 需要相容多種 ORM/查詢建構器
  - 泛型 `T` 允許使用者指定返回類型
  - 索引簽名允許適配器模式

**使用範例**:
```typescript
const dbService: DatabaseService = {
  execute: async (sql, bindings) => yourDbClient.query(sql, bindings),
  transaction: async (callback) => yourDbClient.transaction(callback),
}

const config: DatabaseDriverConfig = {
  driver: 'database',
  dbService,
  table: 'jobs',
}
```

---

### RedisDriverConfig

Redis 驅動配置。

```typescript
export interface RedisDriverConfig {
  driver: 'redis'
  
  /** Redis 客戶端實例 */
  client: any // 將在 RedisDriver 中細化
  
  /** 可選的 key 前綴 */
  prefix?: string
}
```

**為什麼 `client: any`?**

Redis 生態系統有多個客戶端實作，我們在 `RedisDriver` 中定義了統一介面：

```typescript
export interface RedisClient {
  lpush(key: string, ...values: string[]): Promise<number>
  rpop(key: string): Promise<string | null>
  brpop(...args: any[]): Promise<[string, string] | null>
  llen(key: string): Promise<number>
  // ... 其他方法
  [key: string]: any // 允許額外方法
}

export interface GroupRedisClient extends RedisClient {
  pushGroupJob?(...): Promise<number>
  completeGroupJob?(...): Promise<number | null>
}
```

實際使用時會轉換為這些類型。

---

### 其他驅動配置

```typescript
export interface KafkaDriverConfig {
  driver: 'kafka'
  client: any // kafkajs 客戶端
  consumerGroupId?: string
}

export interface SQSDriverConfig {
  driver: 'sqs'
  client: any // AWS SDK SQS 客戶端
  queueUrlPrefix?: string
  visibilityTimeout?: number
  waitTimeSeconds?: number
}

export interface RabbitMQDriverConfig {
  driver: 'rabbitmq'
  client: any // amqplib 連接
  exchange?: string
  exchangeType?: string
}
```

這些使用 `any` 是因為：
1. 外部套件的類型定義不穩定或不完整
2. 避免強制依賴這些套件的類型
3. 實作層會進行運行時驗證

---

## 客戶端類型相容層

### 問題

不同的客戶端套件有不同的 API 設計：
- **ioredis**: `redis.lpush(key, value1, value2, ...)`
- **node-redis**: `redis.lPush(key, [value1, value2])`

### 解決方案

定義最小公共接口：

```typescript
export interface RedisClient {
  // 核心方法（必須）
  lpush(key: string, ...values: string[]): Promise<number>
  rpop(key: string): Promise<string | null>
  llen(key: string): Promise<number>
  del(key: string, ...keys: string[]): Promise<number>
  
  // 可選方法（進階功能）
  zadd?(key: string, score: number, member: string): Promise<number>
  zrange?(key: string, start: number, end: number, ...args: string[]): Promise<string[]>
  pipeline?(): any
  
  // 允許額外方法（相容性）
  [key: string]: any
}
```

### 類型守衛範例

```typescript
function isIORedis(client: RedisClient): client is IORedisClient {
  return typeof (client as any).defineCommand === 'function'
}

function isNodeRedis(client: RedisClient): client is NodeRedisClient {
  return typeof (client as any).connect === 'function'
}

// 使用
if (isIORedis(this.client)) {
  // 使用 ioredis 特定功能
  this.client.defineCommand('myCommand', { ... })
}
```

---

## 泛型使用

### QueueManager 的泛型

```typescript
class QueueManager {
  async push<T extends Job>(job: T): Promise<T> {
    // 返回相同類型的實例
  }

  async pushMany<T extends Job>(jobs: T[]): Promise<void> {
    // 接受任何 Job 子類
  }
}
```

**優點**:
- ✅ 保留具體 Job 類型
- ✅ 型別推導友好
- ✅ IDE 自動完成

**使用範例**:
```typescript
const email = new SendWelcomeEmail(userId)
const pushedEmail = await queue.push(email) // 類型: SendWelcomeEmail
```

---

### Driver 泛型約束

```typescript
interface QueueDriver {
  push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void>
  pop(queue: string): Promise<SerializedJob | null>
  // ...
}
```

Driver 不使用泛型，因為：
1. 統一處理 `SerializedJob`
2. 避免類型參數傳播
3. 簡化實作

---

## 類型守衛（Type Guards）

### 判斷驅動類型

```typescript
function isRedisDriver(driver: QueueDriver): driver is RedisDriver {
  return 'client' in driver && driver.constructor.name === 'RedisDriver'
}

// 使用
if (isRedisDriver(driver)) {
  // 可以安全訪問 driver.client
  const stats = await driver.stats(queue)
}
```

### 判斷序列化類型

```typescript
function isClassSerialized(job: SerializedJob): boolean {
  return job.type === 'class' && typeof job.className === 'string'
}
```

---

## 內部類型

### JobRow

資料庫查詢結果的行結構（內部使用）。

```typescript
export interface JobRow {
  id: string | number
  queue: string
  payload: string
  attempts: number
  created_at: Date | string | number
  available_at: Date | string | number
  reserved_at?: Date | string | number | null
}
```

**為什麼支援多種類型？**
- 不同資料庫返回不同格式的時間戳
- SQLite 返回字串, MySQL 返回 Date, PostgreSQL 可能返回數字

**使用範例**:
```typescript
const rows = await query.get()
rows.map((r: JobRow & { status: string; archived_at: Date | string }) => {
  const job = JSON.parse(r.payload)
  return { ...job, _status: r.status, _archivedAt: r.archived_at }
})
```

---

## 最佳實踐

### 1. 優先使用具體類型

```typescript
// ❌ 避免
function process(data: any) {
  // ...
}

// ✅ 推薦
function process(job: SerializedJob) {
  // ...
}
```

### 2. 使用泛型約束

```typescript
// ❌ 避免
function register(job: any) {
  // ...
}

// ✅ 推薦
function register<T extends Job>(job: T): T {
  // ...
}
```

### 3. 錯誤處理使用 unknown

```typescript
// ❌ 避免
catch (err: any) {
  console.error(err.message)
}

// ✅ 推薦
catch (err: unknown) {
  const error = err instanceof Error ? err : new Error(String(err))
  console.error(error.message)
}
```

### 4. 為驅動實作定義明確的返回類型

```typescript
class MyDriver implements QueueDriver {
  // ❌ 避免
  async push(queue, job, options?): Promise<void> {
    // ...
  }

  // ✅ 推薦
  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    // ...
  }
}
```

### 5. 使用 JSDoc 補充類型資訊

```typescript
/**
 * 推送任務到佇列。
 *
 * @param job - 要推送的任務實例
 * @returns 推送後的任務（包含 ID）
 *
 * @example
 * ```typescript
 * const email = new SendWelcomeEmail(userId)
 * const result = await queue.push(email)
 * console.log(result.id) // 自動生成的 ID
 * ```
 */
async push<T extends Job>(job: T): Promise<T> {
  // ...
}
```

---

## 常見問題

### Q1: 為什麼有些地方還使用 `any`？

**A**: `@gravito/stream` 中剩餘的 `any` 使用都是**正當化**的，主要在以下情況：

1. **外部客戶端相容** (9 個)
   - Redis/Kafka/RabbitMQ/SQS 客戶端類型
   - 避免強制依賴外部套件類型定義

2. **通用資料庫介面** (3 個)
   - `DatabaseService.execute<T = any>`
   - 需要支援多種 ORM/查詢建構器

3. **索引簽名** (3 個)
   - `[key: string]: any`
   - 允許動態屬性擴展

4. **可變參數** (3 個)
   - `brpop(...args: any[])`
   - Redis 命令的參數數量不固定

5. **Pipeline 返回類型** (1 個)
   - ioredis 的 pipeline 返回複雜的 chainable 類型

---

### Q2: 如何為新驅動定義類型？

**A**: 步驟如下：

1. **定義配置介面**:
```typescript
export interface MyDriverConfig {
  driver: 'mydriver'
  client: MyDriverClient
  // ...其他選項
}
```

2. **添加到聯合類型**:
```typescript
export type QueueConnectionConfig =
  | { driver: 'memory' }
  | DatabaseDriverConfig
  | RedisDriverConfig
  | MyDriverConfig // 新增
  | { driver: string; [key: string]: unknown }
```

3. **實作驅動**:
```typescript
export class MyDriver implements QueueDriver {
  constructor(config: MyDriverConfig) {
    // ...
  }
  
  async push(queue: string, job: SerializedJob): Promise<void> {
    // ...
  }
  
  // ... 其他方法
}
```

---

### Q3: 如何處理 TypeScript strict mode 錯誤？

**A**: 常見錯誤和解決方案：

**錯誤**: `Object is possibly 'null' or 'undefined'`
```typescript
// ❌ 會報錯
const driver = manager.getDriver(name)
driver.push(queue, job) // Object is possibly 'null'

// ✅ 修正
const driver = manager.getDriver(name)
if (! driver) {
  throw new Error(`Driver not found: ${name}`)
}
driver.push(queue, job)
```

**錯誤**: `Type 'any' is not assignable to type 'X'`
```typescript
// ❌ 會報錯
const client: RedisClient = new Redis()

// ✅ 修正
const client = new Redis() as RedisClient
// 或
const client: RedisClient = new Redis() as any as RedisClient
```

---

### Q4: 為什麼 `SerializedJob.createdAt` 是 number 而不是 Date？

**A**: 設計考量：

1. **序列化友好**: JSON 不支援 Date 物件
2. **跨語言相容**: 其他語言更容易處理時間戳
3. **精確度**: 避免時區問題
4. **儲存效率**: 數字比字串更省空間

**轉換方式**:
```typescript
const job: SerializedJob = {
  createdAt: Date.now(), // 儲存為數字
  // ...
}

const date = new Date(job.createdAt) // 轉換為 Date
```

---

### Q5: 如何測試類型的正確性？

**A**: 使用類型測試：

```typescript
import { expectType } from 'tsd'

// 測試返回類型
const result = await queue.push(new SendEmail())
expectType<SendEmail>(result)

// 測試參數類型
queue.push(123) // 應該報錯
queue.push(new SendEmail()) // 應該通過
```

或使用 `@ts-expect-error`:
```typescript
// @ts-expect-error: Should not accept non-Job instances
queue.push({ random: 'object' })

// 這段代碼應該通過
queue.push(new SendEmail())
```

---

## 參考資料

- [TypeScript 手冊 - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript 手冊 - Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [@gravito/stream API 文檔](../README.md)
- [類型安全開發指南](./TYPE_SAFETY_GUIDE.md)

---

**最後更新**: 2026-01-19  
**維護者**: Gravito Team
