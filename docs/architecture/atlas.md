title: Atlas ORM 架構技術規格書
# Atlas ORM 架構技術規格書 (v1.4.0)

## 1. 模組概覽

**Atlas** 是 Gravito 框架中的核心資料庫層（Orbit），提供高效能的 Query Builder 與 Active Record ORM 實作。其設計目標是在保持開發者體驗（DX）的同時，最大化執行效能與記憶體安全性。

### 核心職責
- **Fluent Query Builder**：提供類型安全的鏈式 SQL 建構介面，支援複雜查詢（如巢狀 Where、JSON 操作）。採用組合模式重構，支持模組化子句。
- **Active Record ORM**：基於 Proxy 的模型層，支援髒檢查（Dirty Checking）、生命週期鉤子、關聯管理與**樂觀鎖（Optimistic Locking）**。
- **Connection Management**：支援多資料庫連線池、斷線重連與懶加載（Lazy Initialization）。
- **Migration & Schema**：資料庫版本控制與結構定義（支援 `Schema.create`, `table.softDeletes` 等）。

---

## 2. 技術規格與架構設計

### 2.1 分層架構

Atlas 採用經典的四層架構設計，確保關注點分離：

1.  **Model Layer (Facade)** (`packages/atlas/src/orm/model/Model.ts`)
    -   使用 ES6 Proxy 攔截屬性存取。
    -   負責業務邏輯封裝、資料驗證與關聯定義。
    -   提供 `find`, `save`, `delete` 等 Active Record 方法。
    -   **併發控制**：透過 `@version` 裝飾器實現樂觀鎖，自動處理版本檢查。
2.  **Query Layer (Builder)** (`packages/atlas/src/query/QueryBuilder.ts`)
    -   負責 SQL 語法樹的建構。
    -   實現 Fluent Interface（`where`, `select`, `join`, `orderBy`）。
    -   **關鍵重構**：使用組合模式（Composition Pattern）將 `SelectClause`, `WhereClause`, `JoinClause`, `LimitClause` 拆分為獨立組件，提升代碼可維護性。
    -   **關鍵優化**：Copy-on-Write (CoW) 機制，減少 clone 成本。
3.  **Connection Layer** (`packages/atlas/src/connection/ConnectionManager.ts`)
    -   管理連線生命週期。
    -   提供連線池與自動閒置清理（Idle Cleanup）。
    -   支援 Proxy 模式，實現連線的懶加載。
4.  **Driver Layer** (`packages/atlas/src/drivers/*`)
    -   適配不同資料庫驅動（pg, mysql2, bun:sqlite, bun.sql）。
    -   標準化執行結果介面（`QueryResult`）。

### 2.2 關鍵資料流向

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

## 3. 關鍵設計決策

### 3.1 Proxy-based Smart Guard
**決策**：使用 `Proxy` 來包裝所有模型實例。
**原因**：
-   實現「屬性存取攔截」，支援魔術方法（如關聯屬性存取 `user.posts` 自動轉為 Promise）。
-   自動追蹤屬性變更（Dirty Tracking），無需顯式呼叫 `set()` 方法。
**代價**：Proxy 存取比直接屬性存取慢。
**優化對策**：
-   使用 `WeakMap` 快取 metadata，減少重複計算。

### 3.2 Query Builder 的 Copy-on-Write (CoW)
**決策**：在 `clone()` 時不立即複製陣列（columns, wheres 等），而是共享參考。
**原因**：ORM 操作中頻繁發生 `clone`（例如 `User.query()` 會產生新實例），深拷貝成本高。
**實作**：
-   設定 `_isClone = true`。
-   在任何修改狀態的方法（如 `where()`）呼叫時，觸發 `ensureOwnState()` 才真正複製陣列。
**效益**：在唯讀場景下，物件建立成本大幅降低。

### 3.3 記憶體安全的分頁與串流
**決策**：提供 `chunk()` 方法與游標式串流。
**原因**：避免處理大量數據（如匯出報表）時 Node.js/Bun Heap OOM（Out of Memory）。
**實作**：
-   `chunk` 方法內部自動分頁，回調函數處理完一批數據後釋放記憶體。

### 3.4 樂觀鎖 (Optimistic Locking)
**決策**：在 `Model` 層級實作基於版本的並發控制。
**原因**：防止多個請求同時更新同一筆資料導致的「遺失更新」問題。
**實作**：
-   使用 `@version` 裝飾器標記版本欄位。
-   `Model.save()` 時自動將版本號加入 `WHERE` 子句並在成功後遞增。
-   若受影響行數為 0，拋出 `StaleModelError`。

---

## 4. 風險分析與潛在問題

### 4.1 併發更新風險 (Race Condition)
-   **現況**：✅ 已實作樂觀鎖（Optimistic Locking）。
-   **機制**：開發者只需在 Model 中定義 `@version` 欄位，系統即自動處理衝突檢測。

### 4.2 N+1 查詢問題
-   **現況**：
    -   ✅ `eagerLoad` (`with()`) 已實作 `whereIn` 批次查詢，解決了標準的 N+1 問題。
    -   ⚠️ 透過屬性存取懶加載關聯（如迴圈中 `await user.posts`）時，仍會產生 N+1。
-   **建議**：在開發文檔中強調優先使用 `with()` 進行預加載。

### 4.3 Upsert 實作限制
-   **問題**：`QueryBuilder` 中的 `upsert` 方法標註為 "simplified implementation"。
-   **風險**：目前的實作僅執行 `insert`，若遇主鍵衝突會拋出錯誤，而非執行更新。
-   **建議**：需針對不同 Driver (PG `ON CONFLICT`, MySQL `ON DUPLICATE KEY UPDATE`) 實作真正的 Upsert 語法。

---

## 5. 效能與擴展性

### 5.1 記憶體管理
-   **閒置連線清理**：`ConnectionManager` 內建 `setInterval` 定期清理閒置連線（預設 10 分鐘），防止連線資源洩漏。
-   **Query Log 限制**：Debug 模式下的 Query Log 有 `MAX_LOG_SIZE` (1000) 限制。

### 5.2 大規模數據處理
-   **自動分塊 (Auto-Chunking)**：`insert` 方法內建分塊邏輯 (`calculateOptimalChunkSize`)，防止單次 SQL 語句過長導致封包錯誤。
-   **Prepared Statements**：支援 `getPrepared()`，對於重複查詢可提升效能並減少資料庫解析負擔。

---

## 6. 後續優化建議

1.  **實作 Optimistic Locking** (Priority: High)
    -   在 Model 中引入 `@version` 裝飾器與版本檢查邏輯。

2.  **完善 Native Driver 支援** (Priority: High)
    -   加強對 `Bun.sql` 原生驅動的整合，利用其高效能特性。

3.  **增加子查詢物件支援** (Priority: Medium)
    -   增強 `where` 方法對 `SubQuery` 物件的支援，使複雜查詢更直觀。

4.  **Observability** (Priority: Medium)
    -   整合 OpenTelemetry，提供更詳細的資料庫追蹤指標。
