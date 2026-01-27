# 🌌 Dark Matter Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/dark-matter` 的內部架構、MongoDB 連線管理機制以及 Fluent Query Builder 的設計策略。

---

## 1. 核心哲學：Laravel-style MongoDB for Bun

Dark Matter 旨在為 Gravito 生態系提供一個優雅、強型別且基於 Bun 原生的 MongoDB 客戶端。
- **Fluent API**：受到 Laravel Eloquent/Query Builder 的啟發，提供直觀的鏈式調用介面 (`where`, `orderBy`, `get`)，降低 MongoDB 原生語法 (`$gt`, `$in`) 的認知負擔。
- **Native Performance**：底層使用官方 `mongodb` Driver，但在上層封裝時極力減少抽象開銷，並針對 Bun Runtime 進行優化。
- **Multi-Connection**：原生支援多資料庫連線管理，適合微服務或多租戶架構。

---

## 2. 模組組件分析

### 2.1 MongoManager (Connection Pool Orchestrator)
- **職責**：管理多個具名連線 (`default`, `analytics`, `logs`)。
- **位置**：`src/MongoManager.ts`
- **機制**：
  - 維護 `connections` Map。
  - **Lazy Loading**：連線物件 (`MongoClient`) 僅在首次被請求時實例化，實際的 TCP 連線在第一次查詢或顯式呼叫 `connect()` 時建立。

### 2.2 MongoClient (Driver Wrapper)
- **職責**：封裝原生 `mongodb` Client，處理連線重試與生命週期。
- **位置**：`src/MongoClient.ts`
- **增強功能**：
  - **Auto Retry**：內建指數退避 (Exponential Backoff) 重連機制，解決容器啟動時 DB 尚未就緒的問題。
  - **Transaction Helper**：提供 `withTransaction` 封裝，自動處理 Session 的建立、提交與回滾。

### 2.3 MongoQueryBuilder (Fluent Engine)
- **職責**：將鏈式調用轉換為 MongoDB Filter Document。
- **位置**：`src/MongoQueryBuilder.ts`
- **設計模式**：Builder Pattern。
  - `where('age', '>', 18)` -> `{ age: { $gt: 18 } }`
  - 支援複雜的邏輯：`orWhere`, `whereIn`, `whereRegex`。
  - 支援 `AggregateBuilder` 用於構建 Aggregation Pipeline。

### 2.4 Mongo (Facade)
- **職責**：提供靜態入口，簡化 API 調用。
- **位置**：`src/Mongo.ts`
- **用法**：`Mongo.collection('users')` 等同於 `manager.getDefault().collection('users')`。

---

## 3. 技術規格與設計決策

### 3.1 查詢構建器 (Query Builder)
Dark Matter 選擇不實作完整的 ODM (Object Document Mapper like Mongoose)，而是專注於 Query Builder。
- **理由**：ODM 通常帶來巨大的效能開銷與複雜的型別問題。Query Builder 提供了足夠的 DX (開發者體驗) 同時保持接近原生的效能。
- **型別安全**：利用 TypeScript Generics (`collection<User>('users')`)，讓回傳結果具有正確的型別，但查詢條件 (Where Clause) 目前仍較為寬鬆。

### 3.2 交易管理 (Transactions)
MongoDB 的交易需要 Session 物件在每個操作中傳遞。
- **封裝**：`withTransaction` 接受一個 callback，該 callback 會收到一個綁定了 Session 的 `MongoSession` 物件。
- **Scope**：在 callback 內透過 `session.collection(...)` 進行的所有操作都會自動帶上該 Session，避免開發者手動傳遞的繁瑣與遺漏風險。

### 3.3 連線健康檢查 (Health Check)
`MongoClient` 實作了輕量級的健康檢查。
- **機制**：`getHealthStatus()` 執行 `ping` 指令並測量延遲 (Latency)。
- **用途**：可直接整合至 `/health` 端點或 Kubernetes Liveness Probe。

---

## 4. 潛在風險與效能評估

### 4.1 Builder 物件分配
每次呼叫 `collection()` 都會 `new MongoQueryBuilder`。
- **評估**：雖然 JS 引擎對短命物件優化良好，但在極高頻 (10k+ RPS) 場景下仍產生 GC 壓力。
- **優化**：未來可考慮引入 Object Pool 復用 Builder 實例。

### 4.2 缺乏 Schema 強制
由於不是 ODM，Dark Matter 不會在應用層驗證 Schema。
- **風險**：寫入資料可能不符合預期結構。
- **解法**：依賴 MongoDB 伺服器端的 Schema Validation (`createCollection` 中支援 `validator`)，或配合 `@gravito/mass` (TypeBox) 在 Controller 層先驗證。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **GridFS 完整支援**：目前已規劃但需完善串流上傳/下載介面。
2. **Soft Deletes**：在 Builder 中內建軟刪除支援 (`deletedAt` 過濾)。

### 中期 (v1.2)
1. **Relationship Loader**：實作類似 Eloquent 的 `with` 機制，透過應用層 JOIN (或 `$lookup`) 自動載入關聯資料。

### 長期 (v2.0)
1. **Change Streams Integration**：與 `@gravito/stream` 整合，將資料庫變更自動轉換為 Event 或 Job。

---
*Created by Gravito Architect.*
