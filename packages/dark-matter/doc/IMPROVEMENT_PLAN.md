# @gravito/dark-matter 優化改善計劃

> **版本範圍**: v1.0.0-beta.1 → v1.0.0（穩定版）
> **日期**: 2026-01-26
> **分支**: `docs/dark-matter-improvement-plan`
> **目標**: 達成生產環境可用的穩定版本

---

## 目錄

1. [模組概述](#1-模組概述)
2. [現況分析](#2-現況分析)
3. [問題清單與優先級](#3-問題清單與優先級)
4. [第一階段：穩定性強化（P1）](#4-第一階段穩定性強化p1)
5. [第二階段：功能完善（P2）](#5-第二階段功能完善p2)
6. [第三階段：進階功能（P3）](#6-第三階段進階功能p3)
7. [測試改善計劃](#7-測試改善計劃)
8. [文檔更新計劃](#8-文檔更新計劃)
9. [執行時程與里程碑](#9-執行時程與里程碑)
10. [風險評估](#10-風險評估)
11. [向後相容性](#11-向後相容性)

---

## 1. 模組概述

### 1.1 功能定位

**@gravito/dark-matter** 是 Gravito 框架的 MongoDB 用戶端模組，提供：

- **Bun 原生優化**：針對 Bun runtime 進行效能優化
- **Laravel 風格 API**：直觀的 Fluent Query Builder
- **多連線管理**：支援多個命名連線
- **聚合管道**：完整的 Aggregation Pipeline 支援
- **延遲載入**：mongodb 模組按需載入

### 1.2 架構結構

```
packages/dark-matter/
├── src/
│   ├── index.ts              # 模組入口與匯出
│   ├── Mongo.ts              # Facade 靜態入口點
│   ├── MongoManager.ts       # 多連線管理器
│   ├── MongoClient.ts        # MongoDB 客戶端封裝
│   ├── MongoQueryBuilder.ts  # Query Builder 與 Aggregation Builder
│   └── types/
│       └── index.ts          # 類型定義
├── tests/
│   └── Mongo.test.ts         # 單元測試（Mock-based）
├── README.md                 # 英文文檔
└── README.zh-TW.md           # 繁體中文文檔
```

### 1.3 依賴關係

| 依賴 | 類型 | 必需性 |
|------|------|--------|
| mongodb | Peer | 可選（延遲載入） |
| bun-types | Dev | 必需 |
| typescript | Dev | 必需 |

---

## 2. 現況分析

### 2.1 代碼品質評分

| 維度 | 評分 | 備註 |
|------|------|------|
| 架構設計 | 8.5/10 | Facade + Manager + Builder 分層清晰 |
| 代碼品質 | 7.5/10 | 整體良好，部分類型使用 `any` |
| 測試覆蓋 | 5.0/10 | 僅有 Mock 測試，缺少整合測試 |
| 文檔完整性 | 7.0/10 | README 完整，JSDoc 不足 |
| 類型安全 | 7.0/10 | 存在多處 `any` 與 `Record<string, any>` |
| 錯誤處理 | 6.5/10 | 基本錯誤處理，缺少連線重試機制 |

### 2.2 優勢

- ✅ 清晰的分層架構（Facade → Manager → Client → QueryBuilder）
- ✅ Laravel 風格的 Fluent API 設計
- ✅ 完整的 Query Builder 方法（where、whereIn、orderBy 等）
- ✅ 支援 Aggregation Pipeline
- ✅ 延遲載入 mongodb 模組，減少初始化開銷
- ✅ 支援多連線配置

### 2.3 待改善

- ⚠️ 大量使用 `any` 類型（MongoQueryBuilder.ts:616, MongoClient.ts:226-242）
- ⚠️ 測試僅為 Mock-based，缺少真實 MongoDB 整合測試
- ⚠️ 缺少連線重試機制與連線池監控
- ⚠️ 缺少 README 中列出的 Roadmap 功能
- ⚠️ JSDoc 註解不完整
- ⚠️ 錯誤訊息可以更加詳細

---

## 3. 問題清單與優先級

### P1 - 緊急（穩定版發布前必須完成）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P1-01 | 缺少連線重試機制 | 高 | 生產環境穩定性 |
| P1-02 | `find()` 方法重複載入 ObjectId | 中 | 效能問題 |
| P1-03 | 缺少連線狀態檢查與自動重連 | 高 | 長時間運行的服務 |
| P1-04 | 整合測試覆蓋不足 | 中 | 程式碼可靠性 |
| P1-05 | QueryBuilder `toFilter()` 的 OR 查詢邏輯問題 | 中 | 查詢結果正確性 |

### P2 - 重要（v1.0 功能完善）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P2-01 | 缺少 Transaction 支援 | 中 | 資料一致性場景 |
| P2-02 | 類型定義使用過多 `any` | 低 | 開發者體驗 |
| P2-03 | 缺少批次操作最佳化（bulkWrite） | 低 | 大量資料操作 |
| P2-04 | 缺少連線池監控指標 | 低 | 營運可觀察性 |
| P2-05 | JSDoc 註解不完整 | 低 | 開發者體驗 |

### P3 - 優化（長期 Roadmap）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P3-01 | 缺少 Schema Validation | 低 | 資料完整性 |
| P3-02 | 缺少 Change Streams 支援 | 低 | 即時資料監聽 |
| P3-03 | 缺少 GridFS 支援 | 低 | 大檔案儲存 |
| P3-04 | 缺少查詢快取機制 | 低 | 效能優化 |

---

## 4. 第一階段：穩定性強化（P1）

### 4.1 P1-01：實現連線重試機制

**檔案**: `src/MongoClient.ts`
**行號**: 38-64

**現況代碼**（MongoClient.ts:38-64）:
```typescript
async connect(): Promise<void> {
  if (this.connected) {
    return
  }

  this.mongodb = await this.loadMongoDBModule()
  const uri = this.buildConnectionUri()
  // ... 直接連線，無重試
  await this.client.connect()
}
```

**問題分析**：
- 連線失敗時直接拋出錯誤，無重試機制
- 網路抖動或 MongoDB 暫時不可用會導致服務啟動失敗

**修復方案**:
```typescript
interface RetryConfig {
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier: number
}

async connect(retryConfig?: RetryConfig): Promise<void> {
  if (this.connected) {
    return
  }

  const config: RetryConfig = {
    maxRetries: retryConfig?.maxRetries ?? 3,
    retryDelayMs: retryConfig?.retryDelayMs ?? 1000,
    backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
  }

  this.mongodb = await this.loadMongoDBModule()
  const uri = this.buildConnectionUri()
  const options: MongoClientOptions = {
    maxPoolSize: this.config.maxPoolSize ?? 10,
    minPoolSize: this.config.minPoolSize ?? 1,
  }

  this.client = new this.mongodb.MongoClient(uri, options)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      await this.client.connect()
      const dbName = this.config.database ?? 'test'
      this.db = this.client.db(dbName)
      this.connected = true
      return
    } catch (error) {
      lastError = error as Error
      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(config.backoffMultiplier, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `Failed to connect to MongoDB after ${config.maxRetries + 1} attempts: ${lastError?.message}`
  )
}
```

**驗證測試**:
```typescript
describe('MongoClient connection retry', () => {
  it('should retry on connection failure', async () => {
    const client = new MongoClient({ uri: 'mongodb://invalid:27017' })
    await expect(client.connect({ maxRetries: 2 })).rejects.toThrow(/Failed to connect/)
  })

  it('should succeed on retry', async () => {
    // 使用 mock 模擬第一次失敗、第二次成功
    let attempts = 0
    mock.module('mongodb', () => ({
      MongoClient: class {
        async connect() {
          attempts++
          if (attempts < 2) throw new Error('Connection failed')
        }
        db() { return createDbMock() }
      }
    }))

    const client = new MongoClient({ uri: 'mongodb://localhost:27017' })
    await client.connect({ maxRetries: 3 })
    expect(attempts).toBe(2)
  })
})
```

---

### 4.2 P1-02：優化 ObjectId 載入

**檔案**: `src/MongoQueryBuilder.ts`
**行號**: 291-298, 510-513

**現況代碼**:
```typescript
async find(id: string): Promise<T | null> {
  const { ObjectId } = await this.loadObjectId()  // 每次呼叫都動態載入
  const result = await this.nativeCollection.findOne(
    { _id: new ObjectId(id) },
    // ...
  )
  return result as T | null
}

private async loadObjectId(): Promise<{ ObjectId: MongoObjectIdConstructor }> {
  const mongodb = await import('mongodb')  // 重複動態載入
  return mongodb
}
```

**問題分析**：
- 每次 `find()` 都動態載入 mongodb 模組
- 雖然有模組快取，但增加不必要的 Promise 開銷

**修復方案**:
```typescript
export class MongoQueryBuilder<T = Document> implements MongoCollectionContract<T> {
  // 類別層級快取 ObjectId 建構函數
  private static ObjectIdCtor: MongoObjectIdConstructor | null = null

  // ...

  async find(id: string): Promise<T | null> {
    const ObjectId = await this.getObjectId()
    const result = await this.nativeCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: Object.keys(this.projection).length > 0 ? this.projection : undefined }
    )
    return result as T | null
  }

  private async getObjectId(): Promise<MongoObjectIdConstructor> {
    if (MongoQueryBuilder.ObjectIdCtor) {
      return MongoQueryBuilder.ObjectIdCtor
    }
    const { ObjectId } = await import('mongodb')
    MongoQueryBuilder.ObjectIdCtor = ObjectId
    return ObjectId
  }
}
```

---

### 4.3 P1-03：實現連線狀態檢查與自動重連

**檔案**: `src/MongoClient.ts`

**新增方法**:
```typescript
/**
 * 確保連線可用，若斷線則嘗試重連
 */
async ensureConnected(): Promise<void> {
  if (!this.connected || !this.client) {
    await this.connect()
    return
  }

  try {
    // 執行 ping 命令檢查連線
    await this.db?.command({ ping: 1 })
  } catch {
    // 連線已斷開，嘗試重連
    this.connected = false
    await this.connect()
  }
}

/**
 * 取得連線健康狀態
 */
async getHealthStatus(): Promise<{
  connected: boolean
  latencyMs: number | null
  serverInfo: Record<string, unknown> | null
}> {
  if (!this.connected || !this.db) {
    return { connected: false, latencyMs: null, serverInfo: null }
  }

  try {
    const start = performance.now()
    const result = await this.db.command({ ping: 1 })
    const latencyMs = performance.now() - start

    return {
      connected: true,
      latencyMs: Math.round(latencyMs * 100) / 100,
      serverInfo: result,
    }
  } catch {
    return { connected: false, latencyMs: null, serverInfo: null }
  }
}
```

---

### 4.4 P1-04：補充整合測試

**新增檔案**: `tests/integration.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo, MongoClient } from '../src'

// 整合測試需要真實 MongoDB 實例
// 跳過條件：未設定 MONGODB_URI 環境變數
const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Integration Tests', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_test' }
      }
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    // 清理測試資料
    await Mongo.collection('test_users').deleteMany()
    await Mongo.disconnect()
  })

  describe('CRUD Operations', () => {
    it('should insert and find document', async () => {
      const result = await Mongo.collection('test_users').insert({
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date()
      })

      expect(result.acknowledged).toBe(true)
      expect(result.insertedId).toBeDefined()

      const user = await Mongo.collection('test_users').find(result.insertedId)
      expect(user).not.toBeNull()
      expect(user?.name).toBe('Test User')
    })

    it('should query with where clause', async () => {
      const users = await Mongo.collection('test_users')
        .where('name', 'Test User')
        .get()

      expect(users.length).toBeGreaterThan(0)
    })

    it('should update document', async () => {
      const result = await Mongo.collection('test_users')
        .where('name', 'Test User')
        .update({ name: 'Updated User' })

      expect(result.modifiedCount).toBeGreaterThan(0)
    })

    it('should delete document', async () => {
      const result = await Mongo.collection('test_users')
        .where('name', 'Updated User')
        .delete()

      expect(result.deletedCount).toBeGreaterThan(0)
    })
  })

  describe('Aggregation', () => {
    beforeAll(async () => {
      await Mongo.collection('test_orders').insertMany([
        { customerId: '1', amount: 100, status: 'completed' },
        { customerId: '1', amount: 200, status: 'completed' },
        { customerId: '2', amount: 150, status: 'pending' },
      ])
    })

    afterAll(async () => {
      await Mongo.collection('test_orders').deleteMany()
    })

    it('should group and sum correctly', async () => {
      const stats = await Mongo.collection('test_orders')
        .aggregate()
        .match({ status: 'completed' })
        .group({
          _id: '$customerId',
          total: { $sum: '$amount' }
        })
        .get()

      expect(stats.length).toBe(1)
      expect(stats[0].total).toBe(300)
    })
  })
})
```

---

### 4.5 P1-05：修復 OR 查詢邏輯

**檔案**: `src/MongoQueryBuilder.ts`
**行號**: 444-452

**現況代碼**:
```typescript
toFilter(): FilterDocument {
  if (this.orFilters.length === 0) {
    return { ...this.filters }
  }

  return {
    $or: [this.filters, ...this.orFilters],  // 問題：空 filters 也會被包含
  }
}
```

**問題分析**：
- 當只有 `orWhere()` 沒有 `where()` 時，會包含空的 `filters` 物件
- 可能導致非預期的查詢結果

**修復方案**:
```typescript
toFilter(): FilterDocument {
  const hasMainFilters = Object.keys(this.filters).length > 0
  const hasOrFilters = this.orFilters.length > 0

  if (!hasOrFilters) {
    return { ...this.filters }
  }

  if (!hasMainFilters) {
    // 只有 OR 條件
    return { $or: this.orFilters }
  }

  // 有主條件和 OR 條件
  return {
    $or: [this.filters, ...this.orFilters],
  }
}
```

**驗證測試**:
```typescript
describe('MongoQueryBuilder.toFilter()', () => {
  it('should handle only orWhere conditions', () => {
    const builder = new MongoQueryBuilder(mockCollection, 'test')
    builder.orWhere('status', 'active').orWhere('status', 'pending')

    const filter = builder.toFilter()
    expect(filter).toEqual({
      $or: [{ status: 'active' }, { status: 'pending' }]
    })
  })

  it('should combine where and orWhere conditions', () => {
    const builder = new MongoQueryBuilder(mockCollection, 'test')
    builder.where('type', 'user').orWhere('role', 'admin')

    const filter = builder.toFilter()
    expect(filter).toEqual({
      $or: [{ type: 'user' }, { role: 'admin' }]
    })
  })
})
```

---

## 5. 第二階段：功能完善（P2）

### 5.1 P2-01：實現 Transaction 支援

**檔案**: `src/MongoClient.ts`, `src/types/index.ts`

**新增介面**:
```typescript
// types/index.ts
export interface TransactionOptions {
  readConcern?: { level: 'local' | 'majority' | 'linearizable' | 'snapshot' }
  writeConcern?: { w: number | 'majority'; j?: boolean; wtimeout?: number }
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest'
}

export interface MongoClientContract {
  // 現有方法...
  withTransaction<T>(
    callback: (session: MongoSession) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>
}

export interface MongoSession {
  collection<T = Document>(name: string): MongoCollectionContract<T>
}
```

**實現**:
```typescript
// MongoClient.ts
async withTransaction<T>(
  callback: (session: MongoSession) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const client = this.getClient()
  const session = client.startSession()

  try {
    let result: T
    await session.withTransaction(async () => {
      const sessionWrapper: MongoSession = {
        collection: <U = Document>(name: string) => {
          const nativeCollection = this.getDatabase().collection(name)
          return new MongoQueryBuilder<U>(
            nativeCollection as unknown as MongoNativeCollection,
            name,
            session  // 傳遞 session
          )
        }
      }
      result = await callback(sessionWrapper)
    }, options)
    return result!
  } finally {
    await session.endSession()
  }
}
```

**使用範例**:
```typescript
await Mongo.connection().withTransaction(async (session) => {
  // 從帳戶 A 扣款
  await session.collection('accounts')
    .where('_id', accountAId)
    .update({ $inc: { balance: -100 } })

  // 存入帳戶 B
  await session.collection('accounts')
    .where('_id', accountBId)
    .update({ $inc: { balance: 100 } })
})
```

---

### 5.2 P2-02：強化類型定義

**檔案**: `src/MongoQueryBuilder.ts`, `src/MongoClient.ts`

**現況問題**:
```typescript
// MongoQueryBuilder.ts:616
export interface MongoNativeCollection extends Record<string, any> {  // 使用 any
// MongoClient.ts:226-242
interface NativeMongoClient extends Record<string, any> {  // 使用 any
```

**修復方案**:
```typescript
// 建立嚴格的內部類型定義
export interface MongoNativeCollection {
  find(filter: FilterDocument, options?: FindOptions): MongoCursor
  findOne(filter: FilterDocument, options?: FindOneOptions): Promise<Document | null>
  insertOne(doc: Document): Promise<InsertOneResult>
  insertMany(docs: Document[]): Promise<InsertManyResult>
  updateOne(filter: FilterDocument, update: UpdateDocument): Promise<UpdateResult>
  updateMany(filter: FilterDocument, update: UpdateDocument): Promise<UpdateResult>
  deleteOne(filter: FilterDocument): Promise<DeleteResult>
  deleteMany(filter: FilterDocument): Promise<DeleteResult>
  countDocuments(filter: FilterDocument, options?: CountOptions): Promise<number>
  distinct(field: string, filter: FilterDocument): Promise<unknown[]>
  aggregate(pipeline: PipelineStage[]): MongoCursor
  bulkWrite(operations: BulkWriteOperation[]): Promise<BulkWriteResult>
}

interface FindOptions {
  projection?: Projection
  sort?: SortSpec
  limit?: number
  skip?: number
  session?: unknown
}

interface FindOneOptions {
  projection?: Projection
  session?: unknown
}

interface CountOptions {
  limit?: number
  session?: unknown
}
```

---

### 5.3 P2-03：實現批次操作（bulkWrite）

**檔案**: `src/MongoQueryBuilder.ts`, `src/types/index.ts`

**新增方法**:
```typescript
// types/index.ts
export interface BulkWriteOperation<T = Document> {
  insertOne?: { document: Partial<T> }
  updateOne?: { filter: FilterDocument; update: UpdateDocument; upsert?: boolean }
  updateMany?: { filter: FilterDocument; update: UpdateDocument; upsert?: boolean }
  deleteOne?: { filter: FilterDocument }
  deleteMany?: { filter: FilterDocument }
  replaceOne?: { filter: FilterDocument; replacement: Partial<T>; upsert?: boolean }
}

export interface BulkWriteResult {
  insertedCount: number
  matchedCount: number
  modifiedCount: number
  deletedCount: number
  upsertedCount: number
  acknowledged: boolean
}

// MongoQueryBuilder.ts
async bulkWrite(operations: BulkWriteOperation<T>[]): Promise<BulkWriteResult> {
  const result = await this.nativeCollection.bulkWrite(operations as BulkWriteOperation[])
  return {
    insertedCount: result.insertedCount,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    deletedCount: result.deletedCount,
    upsertedCount: result.upsertedCount,
    acknowledged: result.acknowledged,
  }
}
```

**使用範例**:
```typescript
const result = await Mongo.collection('users').bulkWrite([
  { insertOne: { document: { name: 'Alice', status: 'active' } } },
  { updateOne: { filter: { name: 'Bob' }, update: { $set: { status: 'inactive' } } } },
  { deleteOne: { filter: { status: 'deleted' } } },
])

console.log(`Inserted: ${result.insertedCount}, Modified: ${result.modifiedCount}`)
```

---

### 5.4 P2-04：實現連線池監控

**新增檔案**: `src/MongoPoolMetrics.ts`

```typescript
export interface PoolMetrics {
  totalConnections: number
  availableConnections: number
  waitQueueSize: number
  currentCheckedOutCount: number
}

export class MongoPoolMonitor {
  private client: MongoClient

  constructor(client: MongoClient) {
    this.client = client
  }

  /**
   * 取得連線池指標
   * 注意：需要 mongodb driver 4.0+
   */
  getMetrics(): PoolMetrics | null {
    const nativeClient = (this.client as any).client
    if (!nativeClient?.topology) {
      return null
    }

    // 從 topology 取得連線池統計
    const servers = nativeClient.topology.s.servers
    let total = 0
    let available = 0
    let waitQueue = 0
    let checkedOut = 0

    for (const [, server] of servers) {
      const pool = server.pool
      if (pool) {
        total += pool.totalConnectionCount ?? 0
        available += pool.availableConnectionCount ?? 0
        waitQueue += pool.waitQueueSize ?? 0
        checkedOut += pool.currentCheckedOutCount ?? 0
      }
    }

    return {
      totalConnections: total,
      availableConnections: available,
      waitQueueSize: waitQueue,
      currentCheckedOutCount: checkedOut,
    }
  }
}
```

---

### 5.5 P2-05：完善 JSDoc 註解

**範例**（MongoQueryBuilder.ts）:
```typescript
/**
 * MongoDB Query Builder
 *
 * 提供 Laravel 風格的 Fluent API 進行 MongoDB 查詢操作。
 * 支援鏈式呼叫、條件過濾、排序、分頁等功能。
 *
 * @typeParam T - 文檔類型，預設為通用 Document
 *
 * @example 基本查詢
 * ```typescript
 * const users = await Mongo.collection<User>('users')
 *   .where('status', 'active')
 *   .orderBy('createdAt', 'desc')
 *   .limit(10)
 *   .get()
 * ```
 *
 * @example 複合條件
 * ```typescript
 * const results = await Mongo.collection('orders')
 *   .where('status', 'pending')
 *   .where('amount', '>', 100)
 *   .whereIn('category', ['electronics', 'clothing'])
 *   .get()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class MongoQueryBuilder<T = Document> implements MongoCollectionContract<T> {
  /**
   * 新增一個基本的 WHERE 條件
   *
   * @param field - 要過濾的欄位名稱
   * @param operatorOrValue - 運算子（如 '>', '=', 'in'）或直接的值（等於比較）
   * @param value - 當提供運算子時，這是要比較的值
   * @returns 查詢建構器實例（支援鏈式呼叫）
   *
   * @example 等於比較
   * ```typescript
   * builder.where('name', 'John')
   * ```
   *
   * @example 使用運算子
   * ```typescript
   * builder.where('age', '>', 18)
   * builder.where('status', '!=', 'deleted')
   * ```
   */
  where(field: string, operatorOrValue: FilterOperator | unknown, value?: unknown): this {
    // ...
  }
}
```

---

## 6. 第三階段：進階功能（P3）

### 6.1 P3-01：Schema Validation

**新增介面與實現**:
```typescript
// types/index.ts
export interface SchemaValidationOptions {
  validator: Record<string, unknown>  // JSON Schema 或 MongoDB validator
  validationLevel?: 'off' | 'strict' | 'moderate'
  validationAction?: 'error' | 'warn'
}

// MongoDatabaseWrapper 擴展
async createCollection(
  name: string,
  options?: { schema?: SchemaValidationOptions }
): Promise<void> {
  const createOptions: Record<string, unknown> = {}

  if (options?.schema) {
    createOptions.validator = options.schema.validator
    createOptions.validationLevel = options.schema.validationLevel ?? 'strict'
    createOptions.validationAction = options.schema.validationAction ?? 'error'
  }

  await this.db.createCollection(name, createOptions)
}

async setValidation(
  collectionName: string,
  schema: SchemaValidationOptions
): Promise<void> {
  await this.db.command({
    collMod: collectionName,
    validator: schema.validator,
    validationLevel: schema.validationLevel ?? 'strict',
    validationAction: schema.validationAction ?? 'error',
  })
}
```

**使用範例**:
```typescript
await Mongo.database().createCollection('users', {
  schema: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'email'],
        properties: {
          name: { bsonType: 'string', minLength: 1 },
          email: { bsonType: 'string', pattern: '^.+@.+$' },
          age: { bsonType: 'int', minimum: 0, maximum: 150 }
        }
      }
    },
    validationLevel: 'strict',
    validationAction: 'error'
  }
})
```

---

### 6.2 P3-02：Change Streams 支援

**新增介面與實現**:
```typescript
// types/index.ts
export interface ChangeStreamOptions {
  fullDocument?: 'default' | 'updateLookup' | 'whenAvailable' | 'required'
  resumeAfter?: unknown
  startAtOperationTime?: Date
}

export interface ChangeEvent<T = Document> {
  operationType: 'insert' | 'update' | 'replace' | 'delete' | 'invalidate' | 'drop'
  documentKey: { _id: string }
  fullDocument?: T
  updateDescription?: {
    updatedFields: Record<string, unknown>
    removedFields: string[]
  }
  clusterTime: Date
}

// MongoQueryBuilder 擴展
watch(
  pipeline?: PipelineStage[],
  options?: ChangeStreamOptions
): AsyncIterable<ChangeEvent<T>> {
  const changeStream = this.nativeCollection.watch(pipeline ?? [], options)

  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        const hasNext = await changeStream.hasNext()
        if (!hasNext) {
          return { done: true, value: undefined }
        }
        const event = await changeStream.next()
        return { done: false, value: event as ChangeEvent<T> }
      },
      return: async () => {
        await changeStream.close()
        return { done: true, value: undefined }
      }
    })
  }
}
```

**使用範例**:
```typescript
const stream = Mongo.collection('orders').watch(
  [{ $match: { 'fullDocument.status': 'completed' } }],
  { fullDocument: 'updateLookup' }
)

for await (const event of stream) {
  console.log(`Order ${event.documentKey._id}: ${event.operationType}`)
  if (event.fullDocument) {
    await notifyCustomer(event.fullDocument)
  }
}
```

---

### 6.3 P3-03：GridFS 支援

**新增檔案**: `src/MongoGridFS.ts`

```typescript
export interface GridFSUploadOptions {
  filename: string
  chunkSizeBytes?: number
  metadata?: Record<string, unknown>
  contentType?: string
}

export interface GridFSFile {
  _id: string
  filename: string
  length: number
  chunkSize: number
  uploadDate: Date
  metadata?: Record<string, unknown>
  contentType?: string
}

export class MongoGridFS {
  private bucket: GridFSBucket

  constructor(db: NativeMongoDatabase, bucketName = 'fs') {
    this.bucket = new GridFSBucket(db, { bucketName })
  }

  /**
   * 上傳檔案
   */
  async upload(
    source: Buffer | ReadableStream,
    options: GridFSUploadOptions
  ): Promise<string> {
    const uploadStream = this.bucket.openUploadStream(options.filename, {
      chunkSizeBytes: options.chunkSizeBytes,
      metadata: options.metadata,
      contentType: options.contentType,
    })

    if (source instanceof Buffer) {
      uploadStream.write(source)
      uploadStream.end()
    } else {
      // Handle ReadableStream
      const reader = source.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        uploadStream.write(value)
      }
      uploadStream.end()
    }

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()))
      uploadStream.on('error', reject)
    })
  }

  /**
   * 下載檔案
   */
  async download(fileId: string): Promise<Buffer> {
    const { ObjectId } = await import('mongodb')
    const downloadStream = this.bucket.openDownloadStream(new ObjectId(fileId))

    const chunks: Buffer[] = []
    return new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk))
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)))
      downloadStream.on('error', reject)
    })
  }

  /**
   * 刪除檔案
   */
  async delete(fileId: string): Promise<void> {
    const { ObjectId } = await import('mongodb')
    await this.bucket.delete(new ObjectId(fileId))
  }

  /**
   * 列出檔案
   */
  async list(filter?: FilterDocument): Promise<GridFSFile[]> {
    const cursor = this.bucket.find(filter ?? {})
    return await cursor.toArray() as unknown as GridFSFile[]
  }
}
```

---

## 7. 測試改善計劃

### 7.1 測試覆蓋目標

| 類型 | 現況 | 目標 |
|------|------|------|
| 單元測試 | ~60% | 85% |
| 整合測試 | 0% | 70% |
| 邊界測試 | ~20% | 80% |

### 7.2 新增測試清單

| 測試檔案 | 測試內容 | 優先級 |
|----------|----------|--------|
| `integration.test.ts` | 真實 MongoDB 整合測試 | P1 |
| `query-builder.test.ts` | QueryBuilder 完整單元測試 | P1 |
| `aggregation.test.ts` | Aggregation Pipeline 測試 | P2 |
| `connection.test.ts` | 連線重試、健康檢查測試 | P1 |
| `transaction.test.ts` | Transaction 功能測試 | P2 |
| `edge-cases.test.ts` | 邊界條件與錯誤處理 | P2 |

### 7.3 CI 整合測試配置

```yaml
# .github/workflows/test.yml
jobs:
  integration-test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
        env:
          MONGODB_URI: mongodb://localhost:27017
```

---

## 8. 文檔更新計劃

### 8.1 需更新的文檔

| 文檔 | 更新內容 | 優先級 |
|------|----------|--------|
| README.md | 更新 Roadmap 狀態、新增 API 範例 | P1 |
| README.zh-TW.md | 同步更新繁體中文版 | P1 |
| CHANGELOG.md | 新增版本變更記錄 | P1 |
| API.md | 新增完整 API 參考文檔 | P2 |

### 8.2 CHANGELOG 更新範本

```markdown
## [1.0.0] - YYYY-MM-DD

### Added
- 連線重試機制與指數退避策略 (#P1-01)
- 連線健康檢查 `ensureConnected()` 與 `getHealthStatus()` (#P1-03)
- Transaction 支援 `withTransaction()` (#P2-01)
- 批次操作 `bulkWrite()` (#P2-03)
- 連線池監控 `MongoPoolMonitor` (#P2-04)

### Fixed
- 修復 `find()` 方法重複載入 ObjectId 的效能問題 (#P1-02)
- 修復 `toFilter()` 在僅有 orWhere 條件時的邏輯問題 (#P1-05)

### Changed
- 強化內部類型定義，移除不必要的 `any` (#P2-02)
- 完善所有公開 API 的 JSDoc 註解 (#P2-05)

## [1.1.0] - YYYY-MM-DD

### Added
- Schema Validation 支援 (#P3-01)
- Change Streams 支援 (#P3-02)
- GridFS 檔案儲存支援 (#P3-03)
```

---

## 9. 執行時程與里程碑

### 9.1 階段規劃

```
┌─────────────────────────────────────────────────────────────────────┐
│ 第一階段 (P1)：穩定性強化                                            │
├─────────────────────────────────────────────────────────────────────┤
│ • P1-01: 實現連線重試機制                                            │
│ • P1-02: 優化 ObjectId 載入                                          │
│ • P1-03: 連線狀態檢查與自動重連                                       │
│ • P1-04: 補充整合測試                                                │
│ • P1-05: 修復 OR 查詢邏輯                                            │
│ • 發布 v1.0.0-rc.1                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 第二階段 (P2)：功能完善                                              │
├─────────────────────────────────────────────────────────────────────┤
│ • P2-01: Transaction 支援                                            │
│ • P2-02: 強化類型定義                                                │
│ • P2-03: 批次操作 bulkWrite                                          │
│ • P2-04: 連線池監控                                                  │
│ • P2-05: 完善 JSDoc                                                  │
│ • 發布 v1.0.0 穩定版                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 第三階段 (P3)：進階功能                                              │
├─────────────────────────────────────────────────────────────────────┤
│ • P3-01: Schema Validation                                           │
│ • P3-02: Change Streams                                              │
│ • P3-03: GridFS 支援                                                 │
│ • 發布 v1.1.0                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 里程碑

| 里程碑 | 目標版本 | 完成標準 |
|--------|----------|----------|
| M1 | v1.0.0-rc.1 | P1 全部完成，整合測試通過 |
| M2 | v1.0.0 | P2 全部完成，測試覆蓋率 ≥ 80% |
| M3 | v1.1.0 | P3 全部完成，Roadmap 項目實現 |

---

## 10. 風險評估

### 10.1 技術風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| Transaction 在 standalone MongoDB 不可用 | 高 | 中 | 文檔說明需 Replica Set |
| Change Streams 資源洩漏 | 中 | 高 | 提供明確的 close 機制 |
| 連線重試導致啟動延遲 | 低 | 低 | 提供可配置的重試參數 |
| GridFS 大檔案記憶體問題 | 中 | 高 | 使用 Stream API |

### 10.2 相容性風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| mongodb driver 版本相容 | 低 | 中 | 支援 mongodb ^6.0.0 |
| Bun runtime 相容性 | 低 | 高 | CI 測試多版本 Bun |

---

## 11. 向後相容性

### 11.1 Breaking Changes 分析

**P1 階段**：無 Breaking Changes
- 所有修復都是內部實現變更
- API 介面保持不變

**P2 階段**：無 Breaking Changes
- Transaction、bulkWrite 等都是新增功能
- 類型強化不影響執行時行為

**P3 階段**：無 Breaking Changes
- Schema Validation、Change Streams、GridFS 都是新增功能

### 11.2 版本策略

| 階段 | 版本號 | 說明 |
|------|--------|------|
| P1 完成 | v1.0.0-rc.1 | Release Candidate |
| P2 完成 | v1.0.0 | 穩定版正式發布 |
| P3 完成 | v1.1.0 | 功能擴展版本 |

---

## 附錄

### A. 檔案變更清單

| 檔案路徑 | 變更類型 | 階段 |
|----------|----------|------|
| `src/MongoClient.ts` | 修改 | P1, P2 |
| `src/MongoQueryBuilder.ts` | 修改 | P1, P2, P3 |
| `src/types/index.ts` | 修改 | P2, P3 |
| `src/MongoPoolMetrics.ts` | 新增 | P2 |
| `src/MongoGridFS.ts` | 新增 | P3 |
| `tests/integration.test.ts` | 新增 | P1 |
| `tests/query-builder.test.ts` | 新增 | P1 |
| `tests/transaction.test.ts` | 新增 | P2 |
| `README.md` | 修改 | P1, P2 |
| `README.zh-TW.md` | 修改 | P1, P2 |
| `CHANGELOG.md` | 新增 | P1 |

### B. 相關資源

- [MongoDB Node.js Driver 文檔](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Transaction 指南](https://www.mongodb.com/docs/manual/core/transactions/)
- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [MongoDB GridFS](https://www.mongodb.com/docs/manual/core/gridfs/)

---

**文檔版本**: 1.0
**最後更新**: 2026-01-26
**作者**: Claude Code + Carl
**審查狀態**: 初版完成
