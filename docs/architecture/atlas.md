---
title: Atlas ORM 架構技術規格書
version: 1.5.1
status: Stable
tier: B
last_updated: 2026-01-29
---

# Atlas ORM 架構技術規格書

## 模組概覽

**Atlas** (`@gravito/atlas`) 是 Gravito 框架的核心資料庫層（Orbit），提供高效能的 Query Builder 與 Active Record ORM 實作。其設計目標是在保持開發者體驗（DX）的同時，最大化執行效能與記憶體安全性。

### 核心職責
- **Fluent Query Builder**：類型安全的鏈式 SQL 建構介面。
- **Active Record ORM**：基於 Proxy 的模型層，支援髒檢查與關聯管理。
- **Connection Management**：多資料庫連線池、斷線重連與懶加載。
- **Migration & Schema**：資料庫版本控制與結構定義。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/atlas
```

### 2. 基本用法
```typescript
import { Atlas } from '@gravito/atlas'
import { Model } from '@gravito/atlas/orm'

// 配置資料庫連線
const atlas = new Atlas({
  driver: 'postgres',
  host: 'localhost',
  database: 'myapp',
  username: 'user',
  password: 'password'
})

// 定義模型
class User extends Model {
  static table = 'users'
}

// 查詢資料
const users = await User.query().where('active', true).get()
```

### 3. 關聯定義
```typescript
class Post extends Model {
  static table = 'posts'
  
  user() {
    return this.belongsTo(User)
  }
}
```

### 4. 事務處理 (Transactions)
```typescript
await Atlas.transaction(async (trx) => {
  await User.query(trx).create({ name: 'Alice' })
  await Post.query(trx).create({ title: 'Hello', user_id: 1 })
})
```

### 5. 分頁與批次處理
```typescript
const { data, meta } = await User.query().paginate(1, 15)

await User.query().chunk(100, (users) => {
  // 處理每批 100 筆資料
})
```

## 架構設計

### 1. 技術規格與分層架構

Atlas 採用經典的四層架構設計，確保關注點分離：

1. **Model Layer (Facade)** (`packages/atlas/src/orm/model/Model.ts`)
   - 使用 ES6 Proxy 攔截屬性存取。
   - 負責業務邏輯封裝、資料驗證與關聯定義。
   - 提供 `find`, `save`, `delete` 等 Active Record 方法。
   - **併發控制**：透過 `@version` 裝飾器實現樂觀鎖，自動處理版本檢查。

2. **Query Layer (Builder)** (`packages/atlas/src/query/QueryBuilder.ts`)
   - 負責 SQL 語法樹的建構。
   - 實現 Fluent Interface（`where`, `select`, `join`, `orderBy`）。
   - **關鍵重構**：使用組合模式（Composition Pattern）將 `SelectClause`, `WhereClause`, `JoinClause`, `LimitClause` 拆分為獨立組件，提升代碼可維護性。
   - **關鍵優化**：Copy-on-Write (CoW) 機制，減少 clone 成本。

3. **Connection Layer** (`packages/atlas/src/connection/ConnectionManager.ts`)
   - 管理連線生命週期。
   - 提供連線池與自動閒置清理（Idle Cleanup）。
   - 支援 Proxy 模式，實現連線的懶加載。

4. **Driver Layer** (`packages/atlas/src/drivers/*`)
   - 適配不同資料庫驅動（pg, mysql2, bun:sqlite, bun.sql）。
   - 標準化執行結果介面（`QueryResult`）。

### 2. 關鍵資料流向

#### 查詢流程 (Read Path)
```mermaid
graph LR
    User -->|User.find(1)| Model
    Model -->|Model.query()| QueryBuilder
    QueryBuilder -->|connection.raw()| Connection
    Connection -->|driver.query()| Driver
    Driver -->|Rows| Connection
    Connection -->|Raw Data| QueryBuilder
    QueryBuilder -->|Model.hydrate()| Model
    Model -->|Proxy Instance| User
```

#### 寫入流程 (Write Path)
```mermaid
graph LR
    User -->|user.save()| ModelProxy
    ModelProxy -->|set property| DirtyTracker
    User -->|await save()| Model
    Model -->|getDirty()| DirtyTracker
    Model -->|performUpdate/Insert| QueryBuilder
    QueryBuilder -->|execute()| Database
```

---

## 關鍵設計決策

### 3.1 Proxy-based Smart Guard
**決策**：使用 `Proxy` 來包裝所有模型實例。
**原因**：
- 實現「屬性存取攔截」，支援魔術方法（如關聯屬性存取 `user.posts` 自動轉為 Promise）。
- 自動追蹤屬性變更（Dirty Tracking），無需顯式呼叫 `set()` 方法。
**優化對策**：
- 使用 `WeakMap` 快取 metadata，減少重複計算。

### 3.2 Query Builder 的 Copy-on-Write (CoW)
**決策**：在 `clone()` 時不立即複製陣列（columns, wheres 等），而是共享參考。
**原因**：ORM 操作中頻繁發生 `clone`（例如 `User.query()` 會產生新實例），深拷貝成本高。
**效益**：在唯讀場景下，物件建立成本大幅降低。

### 3.3 記憶體安全的分頁與串流
**決策**：提供 `chunk()` 方法與游標式串流。
**原因**：避免處理大量數據時發生 OOM (Out of Memory)。

---

## API 參考

### Model
- `find(id: any): Promise<Model | null>`
- `query(): QueryBuilder`
- `save(): Promise<boolean>`
- `delete(): Promise<boolean>`

### QueryBuilder
- `where(column: string, value: any): this`
- `select(...columns: string[]): this`
- `join(table: string, first: string, operator: string, second: string): this`
- `get(): Promise<any[]>`

---

## 風險分析與潛在問題

### 4.1 併發更新風險 (Race Condition)
- **現況**：✅ 已實作樂觀鎖（Optimistic Locking）。
- **機制**：開發者只需在 Model 中定義 `@version` 欄位，系統即自動處理衝突檢測。

### 4.2 N+1 查詢問題
- **現況**：
  - ✅ `eagerLoad` (`with()`) 已實作 `whereIn` 批次查詢，解決了標準的 N+1 問題。
  - ⚠️ 透過屬性存取懶加載關聯時仍會產生 N+1。
- **建議**：優先使用 `with()` 進行預加載。

### 4.3 Upsert 實作限制
- **問題**：`upsert` 方法目前僅執行 `insert`。
- **建議**：需針對不同 Driver 實作真正的 Upsert 語法。

---

## 後續優化建議

1. ✅ **完善 Native Driver 支援** (Priority: High) - **已完成 v1.5.0**
2. ✅ **增加子查詢物件支援** (Priority: Medium) - **已完成 v1.5.1**
3. **Observability** (Priority: High): 整合 OpenTelemetry。
4. ✅ **查詢結果快取** (Priority: Medium) - **已完成 v1.5.1**

