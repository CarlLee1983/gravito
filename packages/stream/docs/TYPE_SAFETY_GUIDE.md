# @gravito/stream 類型安全開發指南

> **版本**: 3.0.0  
> **目標讀者**: 開發者、套件貢獻者  
> **最後更新**: 2026-01-19

## 📚 目錄

1. [為什麼類型安全很重要](#為什麼類型安全很重要)
2. [擴展驅動的類型要求](#擴展驅動的類型要求)
3. [實作自定義序列化器](#實作自定義序列化器)
4. [類型安全的錯誤處理](#類型安全的錯誤處理)
5. [測試中的類型 Mocking](#測試中的類型-mocking)
6. [避免常見的類型陷阱](#避免常見的類型陷阱)
7. [使用 TypeScript 嚴格模式](#使用-typescript-嚴格模式)
8. [實戰案例](#實戰案例)

---

## 為什麼類型安全很重要

### 編譯時安全

```typescript
// ❌ 沒有類型安全
const queue = getQueue()
queue.push({ data: 'test' }) // 運行時才會出錯

// ✅ 有類型安全
const queue = getQueue()
queue.push(new SendEmail()) // 立即發現錯誤
queue.push({ data: 'test' }) // 編譯錯誤: Argument of type '{ data: string }' is not assignable to parameter of type 'Job'
```

### IDE 支援

類型安全提供：
- ✅ **自動完成**: 輸入 `queue.` 立即看到所有可用方法
- ✅ **參數提示**: 滑鼠懸停查看方法簽名
- ✅ **重構安全**: 改名時自動更新所有引用
- ✅ **即時錯誤**: 不用運行代碼就發現問題

### 維護性

```typescript
// 6 個月後回來看代碼
function process(data: SerializedJob) {
  // 明確知道 data 的結構
  console.log(`Processing job ${data.id}`)
}

function process(data: any) {
  // 不知道 data 是什麼，需要查文檔或運行代碼
}
```

---

## 擴展驅動的類型要求

### 1. 定義驅動配置類型

```typescript
// src/types.ts

/**
 * 你的自定義驅動配置。
 * @public
 */
export interface CustomDriverConfig {
  /** 驅動類型識別 */
  driver: 'custom'
  
  /** 你的客戶端實例 */
  client: CustomClient
  
  /** 可選配置 */
  endpoint?: string
  apiKey?: string
  timeout?: number
}
```

**最佳實踐**:
- ✅ 使用 literal type 作為 `driver` 值（例如 `'custom'`）
- ✅ 為所有選項提供 JSDoc 註解
- ✅ 使用 `?` 標記可選屬性
- ✅ 添加 `@public` 標記（給文檔生成器用）

---

### 2. 添加到聯合類型

```typescript
// src/types.ts

export type QueueConnectionConfig =
  | { driver: 'memory' }
  | DatabaseDriverConfig
  | RedisDriverConfig
  | CustomDriverConfig // 新增你的配置
  | { driver: string; [key: string]: unknown } // fallback
```

**注意**: 保留最後的 fallback 類型，確保未知驅動仍然可以使用。

---

### 3. 實作驅動類

```typescript
// src/drivers/CustomDriver.ts

import type { QueueDriver } from './QueueDriver'
import type { CustomDriverConfig } from '../types'
import type { SerializedJob, JobPushOptions } from '../types'

/**
 * Custom queue driver implementation.
 * 
 * @example
 * ```typescript
 * const driver = new CustomDriver({
 *   driver: 'custom',
 *   client: myClient,
 *   endpoint: 'https://api.example.com'
 * })
 * ```
 */
export class CustomDriver implements QueueDriver {
  private client: CustomClient
  private endpoint: string

  constructor(config: CustomDriverConfig) {
    // 類型安全的解構
    this.client = config.client
    this.endpoint = config.endpoint ?? 'https://default.example.com'
    
    // 驗證必要參數
    if (!this.client) {
      throw new Error('[CustomDriver] Client is required')
    }
  }

  /**
   * 推送任務到佇列。
   * 必須實作 QueueDriver 介面的方法。
   */
  async push(
    queue: string,
    job: SerializedJob,
    options?: JobPushOptions
  ): Promise<void> {
    // 實作邏輯
    await this.client.send({
      queue,
      payload: JSON.stringify(job),
      priority: options?.priority,
      groupId: options?.groupId,
    })
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    const message = await this.client.receive(queue)
    if (!message) return null

    try {
      return JSON.parse(message.payload) as SerializedJob
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[CustomDriver] Failed to parse job:', error.message)
      return null
    }
  }

  async size(queue: string): Promise<number> {
    return this.client.getQueueSize(queue)
  }

  async clear(queue: string): Promise<void> {
    await this.client.purge(queue)
  }

  // 可選：實作進階功能
  async stats(queue: string): Promise<QueueStats> {
    return {
      queue,
      size: await this.size(queue),
      delayed: 0, // 如果不支援延遲任務
    }
  }
}
```

**關鍵點**:
- ✅ 實作所有必要的 `QueueDriver` 方法
- ✅ 使用明確的類型標註
- ✅ 錯誤處理使用` unknown` 而非 `any`
- ✅ 提供詳細的 JSDoc 註解

---

### 4. 註冊驅動

```typescript
// src/QueueManager.ts

// 在 driver factory 中添加你的驅動
private createDriver(config: QueueConnectionConfig): QueueDriver {
  switch (config.driver) {
    case 'memory':
      return new MemoryDriver()
    case 'database':
      return new DatabaseDriver(config)
    case 'redis':
      return new RedisDriver(config)
    case 'custom':
      return new CustomDriver(config) // 新增
    default:
      throw new Error(`Unsupported driver: ${config.driver}`)
  }
}
```

---

## 實作自定義序列化器

### 1. 定義序列化器介面

```typescript
/**
 * Job serializer interface.
 * @public
 */
export interface JobSerializer {
  /**
   * 序列化任務實例。
   */
  serialize(job: Job): SerializedJob

  /**
   * 反序列化為任務實例。
   */
  deserialize(data: SerializedJob): Job
}
```

---

### 2. 實作序列化器

```typescript
import type { Job } from './Job'
import type { SerializedJob, JobSerializer } from './types'

/**
 * 自定義 JSON 序列化器，支援壓縮。
 */
export class CompressedJsonSerializer implements JobSerializer {
  serialize(job: Job): SerializedJob {
    // 序列化為 JSON
    const data = JSON.stringify({
      queue: job._queue,
      connection: job._connection,
      delay: job._delay,
      attempts: job._attempts,
      maxAttempts: job._maxAttempts,
      // ... 其他屬性
    })

    // 壓縮數據（假設有 compress 函數）
    const compressed = compress(data)

    return {
      id: generateId(),
      type: 'json',
      data: compressed,
      createdAt: Date.now(),
      attempts: job._attempts ?? 0,
      maxAttempts: job._maxAttempts ?? 3,
    }
  }

  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'json') {
      throw new Error(`Invalid serialization type: ${serialized.type}`)
    }

    // 解壓數據
    const decompressed = decompress(serialized.data)
    const data = JSON.parse(decompressed)

    // 重建 Job 實例
    const job = Object.create(Job.prototype)
    Object.assign(job, data)
    return job
  }
}
```

**最佳實踐**:
- ✅ 實作完整的 `JobSerializer` 介面
- ✅ 驗證序列化類型
- ✅ 處理解析錯誤
- ✅ 保留所有必要的任務屬性

---

### 3. 使用自定義序列化器

```typescript
const manager = new QueueManager({
  default: 'memory',
  connections: {
    memory: { driver: 'memory' },
  },
  defaultSerializer: 'custom', // 或者...
})

// 手動設定序列化器
manager.setSerializer(new CompressedJsonSerializer())
```

---

## 類型安全的錯誤處理

### ❌ 不推薦: 使用 `any`

```typescript
try {
  await driver.push(queue, job)
} catch (err: any) {
  console.error(err.message) // 如果 err 不是 Error，會報錯
  logError(err.stack) // 可能是 undefined
}
```

**問題**:
- 假設 `err` 是 `Error` 物件，但可能不是
- 失去類型安全
- IDE 沒有提示

---

### ✅ 推薦: 使用 `unknown` + 類型守衛

```typescript
try {
  await driver.push(queue, job)
} catch (err: unknown) {
  // 方式 1: 類型守衛
  if (err instanceof Error) {
    console.error('[Driver]', err.message)
    if (err.stack) {
      console.error(err.stack)
    }
  } else {
    console.error('[Driver] Unknown error:', String(err))
  }
}
```

**優點**:
- ✅ 類型安全
- ✅ 處理非 Error 的情況
- ✅ IDE 有完整提示

---

### 進階: 錯誤轉換函數

```typescript
/**
 * 將未知錯誤轉換為 Error 實例。
 */
function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err
  }
  
  if (typeof err === 'string') {
    return new Error(err)
  }
  
  if (typeof err === 'object' && err !== null) {
    return new Error(JSON.stringify(err))
  }
  
  return new Error(String(err))
}

// 使用
try {
  await driver.push(queue, job)
} catch (err: unknown) {
  const error = toError(err)
  console.error('[Driver]', error.message)
  logError(error.stack ?? '')
}
```

---

### 自定義錯誤類型

```typescript
/**
 * 驅動錯誤基類。
 */
export class DriverError extends Error {
  constructor(
    message: string,
    public readonly driver: string,
    public readonly queue: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'DriverError'
  }
}

/**
 * 連接錯誤。
 */
export class ConnectionError extends DriverError {
  constructor(driver: string, originalError?: unknown) {
    super(
      `Failed to connect to ${driver}`,
      driver,
      '',
      originalError
    )
    this.name = 'ConnectionError'
  }
}

// 使用
try {
  await driver.push(queue, job)
} catch (err: unknown) {
  throw new DriverError(
    'Failed to push job',
    'custom',
    queue,
    err
  )
}
```

---

## 測試中的類型 Mocking

### 1. Mock Driver

```typescript
import type { QueueDriver } from '../src/drivers/QueueDriver'
import type { SerializedJob } from '../src/types'

/**
 * 測試用的 Mock Driver。
 */
class MockDriver implements QueueDriver {
  private jobs: Map<string, SerializedJob[]> = new Map()

  async push(queue: string, job: SerializedJob): Promise<void> {
    if (!this.jobs.has(queue)) {
      this.jobs.set(queue, [])
    }
    this.jobs.get(queue)!.push(job)
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    const jobs = this.jobs.get(queue)
    return jobs?.shift() ?? null
  }

  async size(queue: string): Promise<number> {
    return this.jobs.get(queue)?.length ?? 0
  }

  async clear(queue: string): Promise<void> {
    this.jobs.delete(queue)
  }

  // 測試專用方法
  getAllJobs(queue: string): SerializedJob[] {
    return this.jobs.get(queue) ?? []
  }

  reset(): void {
    this.jobs.clear()
  }
}
```

---

### 2. 使用 Mock

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'

describe('QueueManager with MockDriver', () => {
  let mockDriver: MockDriver
  let manager: QueueManager

  beforeEach(() => {
    mockDriver = new MockDriver()
    manager = new QueueManager({
      default: 'mock',
      connections: {
        mock: { driver: 'memory' } as any, // 臨時處理
      },
    })
    
    // 替換內部驅動
    ;(manager as any).drivers.set('mock', mockDriver)
  })

  test('should push and pop jobs', async () => {
    const job = new TestJob()
    await manager.push(job)

    const popped = await manager.pop()
    expect(popped).toBeDefined()
    expect(popped?.id).toBe(job.id)
  })

  test('should track queue size', async () => {
    await manager.push(new TestJob())
    await manager.push(new TestJob())

    expect(await manager.size()).toBe(2)
    
    await manager.pop()
    expect(await manager.size()).toBe(1)
  })
})
```

---

### 3. 類型安全的 Spy

```typescript
type SpyFn<T extends (...args: any[]) => any> = T & {
  calls: Parameters<T>[]
  results: ReturnType<T>[]
}

function createSpy<T extends (...args: any[]) => any>(
  fn: T
): SpyFn<T> {
  const calls: Parameters<T>[] = []
  const results: ReturnType<T>[] = []

  const spy = ((...args: Parameters<T>) => {
    calls.push(args)
    const result = fn(...args)
    results.push(result)
    return result
  }) as SpyFn<T>

  spy.calls = calls
  spy.results = results

  return spy
}

// 使用
const pushSpy = createSpy(driver.push.bind(driver))
await pushSpy('default', job)

expect(pushSpy.calls).toHaveLength(1)
expect(pushSpy.calls[0]).toEqual(['default', job])
```

---

## 避免常見的類型陷阱

### 陷阱 1: 過度使用 `any`

```typescript
// ❌ 不好
function processJob(job: any) {
  console.log(job.id) // 沒有類型檢查
}

// ✅ 好
function processJob(job: SerializedJob) {
  console.log(job.id) // 類型安全
}
```

---

### 陷阱 2: 忘記處理 `null` / `undefined`

```typescript
// ❌ 可能出錯
const job = await queue.pop()
console.log(job.id) // Object is possibly 'null'

// ✅ 安全
const job = await queue.pop()
if (job) {
  console.log(job.id)
} else {
  console.log('No job available')
}
```

---

### 陷阱 3: 類型斷言濫用

```typescript
// ❌ 危險
const driver = manager.getDriver('unknown') as RedisDriver
driver.client.lpush('key', 'value') // 可能不是 RedisDriver

// ✅ 安全
const driver = manager.getDriver('unknown')
if (isRedisDriver(driver)) {
  driver.client.lpush('key', 'value')
}
```

---

### 陷阱 4: 忽略泛型約束

```typescript
// ❌ 失去類型資訊
async function pushJob(queue: QueueManager, job: Job) {
  await queue.push(job) // 返回類型是 Job，不是具體類型
}

// ✅ 保留類型資訊
async function pushJob<T extends Job>(queue: QueueManager, job: T): Promise<T> {
  return queue.push(job) // 返回類型是 T
}
```

---

## 使用 TypeScript 嚴格模式

### 啟用嚴格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noImplicitAny": true,
    "alwaysStrict": true
  }
}
```

---

### 處理嚴格模式錯誤

#### 錯誤: `Property 'X' has no initializer`

```typescript
// ❌ 報錯
class MyClass {
  private client: Redis // Error: Property 'client' has no initializer
}

// ✅ 修正方式 1: 在 constructor 初始化
class MyClass {
  private client: Redis
  
  constructor(client: Redis) {
    this.client = client
  }
}

// ✅ 修正方式 2: 使用 definite assignment assertion
class MyClass {
  private client!: Redis // 告訴 TS 會在後續初始化
  
  async init(client: Redis) {
    this.client = client
  }
}

// ✅ 修正方式 3: 使用可選屬性
class MyClass {
  private client?: Redis
  
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Client not initialized')
    }
    return this.client
  }
}
```

---

#### 錯誤: `Object is possibly 'null' or 'undefined'`

```typescript
// ❌ 報錯
const job = await queue.pop()
console.log(job.id) // Error: Object is possibly 'null'

// ✅ 修正: 類型守衛
const job = await queue.pop()
if (job) {
  console.log(job.id)
}

// ✅ 修正: Optional chaining
const job = await queue.pop()
console.log(job?.id ?? 'No job')

// ✅ 修正: Non-null assertion (謹慎使用)
const job = await queue.pop()
console.log(job!.id) // 確信不會是 null 時使用
```

---

## 實戰案例

### 案例 1: 實作優先級佇列驅動

```typescript
/**
 * 優先級佇列驅動配置。
 */
export interface PriorityQueueConfig {
  driver: 'priority'
  backend: QueueDriver // 包裝另一個驅動
  priorities: string[] // ['critical', 'high', 'normal', 'low']
}

/**
 * 優先級佇列驅動實作。
 */
export class PriorityQueueDriver implements QueueDriver {
  private backend: QueueDriver
  private priorities: string[]

  constructor(config: PriorityQueueConfig) {
    this.backend = config.backend
    this.priorities = config.priorities ?? ['critical', 'high', 'normal', 'low']
  }

  async push(
    queue: string,
    job: SerializedJob,
    options?: JobPushOptions
  ): Promise<void> {
    // 根據優先級推送到不同的佇列
    const priority = options?.priority ?? 'normal'
    const priorityQueue = `${queue}:${priority}`
    
    await this.backend.push(priorityQueue, job, options)
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    // 按優先級順序嘗試 pop
    for (const priority of this.priorities) {
      const priorityQueue = `${queue}:${priority}`
      const job = await this.backend.pop(priorityQueue)
      
      if (job) {
        return job
      }
    }
    
    return null
  }

  async size(queue: string): Promise<number> {
    let total = 0
    
    for (const priority of this.priorities) {
      const priorityQueue = `${queue}:${priority}`
      total += await this.backend.size(priorityQueue)
    }
    
    return total
  }

  async clear(queue: string): Promise<void> {
    const promises = this.priorities.map((priority) =>
      this.backend.clear(`${queue}:${priority}`)
    )
    
    await Promise.all(promises)
  }
}
```

---

### 案例 2: 批次處理器

```typescript
/**
 * 批次處理任務。
 */
export class ProcessBatchJob extends Job {
  constructor(private items: string[]) {
    super()
  }

  async handle(): Promise<void> {
    // 批次處理邏輯
    for (const item of this.items) {
      await processItem(item)
    }
  }
}

/**
 * 批次推送輔助函數。
 */
export async function pushBatch<T extends Job>(
  queue: QueueManager,
  jobs: T[],
  batchSize = 10
): Promise<void> {
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize)
    await queue.pushMany(batch)
  }
}

// 使用
const jobs = items.map((item) => new ProcessItemJob(item))
await pushBatch(queue, jobs, 50)
```

---

### 案例 3: 類型安全的事件監聽

```typescript
/**
 * 事件類型定義。
 */
export interface QueueEvents {
  'job:pushed': { job: SerializedJob; queue: string }
  'job:popped': { job: SerializedJob | null; queue: string }
  'job:failed': { job: SerializedJob; error: Error }
  'job:completed': { job: SerializedJob }
}

/**
 * 類型安全的事件發射器。
 */
export class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<(data: any) => void>>()

  on<K extends keyof Events>(
    event: K,
    listener: (data: Events[K]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach((listener) => listener(data))
    }
  }
}

// 使用
const emitter = new TypedEventEmitter<QueueEvents>()

emitter.on('job:pushed', ({ job, queue }) => {
  console.log(`Job ${job.id} pushed to ${queue}`)
})

emitter.on('job:failed', ({ job, error }) => {
  console.error(`Job ${job.id} failed:`, error.message)
})

// 類型錯誤會被捕獲
emitter.on('job:invalid', (data) => {}) // Error: Argument of type '"job:invalid"' is not assignable to parameter
```

---

## 總結

類型安全開發的黃金法則：

1. **避免 `any`**: 除非絕對必要且有充分理由
2. **使用 `unknown`**: 處理未知類型時的第一選擇
3. **嚴格模式**: 始終啟用 TypeScript 嚴格模式
4. **類型守衛**: 使用類型守衛進行運行時檢查
5. **泛型約束**: 保留具體類型資訊
6. **錯誤處理**: 永遠假設 `catch` 的錯誤不是 `Error`
7. **JSDoc 註解**: 補充類型系統無法表達的資訊
8. **測試覆蓋**: 包括類型測試

**記住**: 類型系統是你的朋友，不是敵人。花在修正類型錯誤的時間，遠少於修復運行時 bug 的時間！

---

**參考資料**:
- [類型系統架構](./TYPE_SYSTEM.md)
- [TypeScript 官方文檔](https://www.typescriptlang.org/docs/)
- [@gravito/stream API 文檔](../README.md)

**最後更新**: 2026-01-19  
**維護者**: Gravito Team
