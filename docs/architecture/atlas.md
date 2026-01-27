# Atlas ORM 架構技術規格書

## 1. 模組概覽

**Atlas** 是 Gravito 框架中的核心資料庫層（Orbit），提供高效能的 Query Builder 與 Active Record ORM 實作。其設計目標是在保持開發者體驗（DX）的同時，最大化執行效能與記憶體安全性。

### 核心職責
- **Fluent Query Builder**：提供類型安全的鏈式 SQL 建構介面。
- **Active Record ORM**：基於 Proxy 的模型層，支援髒檢查（Dirty Checking）、生命週期鉤子與關聯管理。
- **Connection Management**：支援多資料庫連線池與懶加載（Lazy Initialization）。
- **Migration & Schema**：資料庫版本控制與結構定義。

---

## 2. 技術規格與架構設計

### 2.1 分層架構

Atlas 採用經典的四層架構設計，確保關注點分離：

1.  **Model Layer (Facade)** (`packages/atlas/src/orm/model/Model.ts`)
    -   使用 ES6 Proxy 攔截屬性存取。
    -   負責業務邏輯封裝、資料驗證與關聯定義。
2.  **Query Layer (Builder)** (`packages/atlas/src/query/QueryBuilder.ts`)
    -   負責 SQL 語法樹的建構。
    -   實現 Fluent Interface（`where`, `select`, `join`）。
    -   **關鍵優化**：Copy-on-Write 機制，減少 clone 成本。
3.  **Connection Layer** (`packages/atlas/src/connection/ConnectionManager.ts`)
    -   管理連線生命週期。
    -   提供連線池與自動閒置清理（Idle Cleanup）。
4.  **Driver Layer** (`packages/atlas/src/drivers/*`)
    -   適配不同資料庫驅動（pg, mysql2, bun:sqlite）。
    -   標準化執行結果介面。

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
    Model -->|validate()| Validator
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
**代價**：
-   Proxy 存取比直接屬性存取慢。
**優化對策**：
-   **Descriptor Cache (`_descriptorCache`)**：使用 `WeakMap` 快取原型鏈查找結果，大幅減少 `get` trap 中的原型遍歷開銷。
-   **Studly Case Cache (`_studlyCache`)**：快取字串轉換結果（snake_case 轉 StudlyCase），優化 Accessor/Mutator 查找。

### 3.2 Query Builder 的 Copy-on-Write
**決策**：在 `clone()` 時不立即複製陣列（columns, wheres 等），而是共享參考。
**原因**：
-   ORM 操作中頻繁發生 `clone`（例如 `User.query()` 會產生新實例），深拷貝成本高。
**實作**：
-   設定 `_isClone = true`。
-   在任何修改狀態的方法（如 `where()`）呼叫時，觸發 `ensureOwnState()` 才真正複製陣列。
**效益**：在唯讀場景下，物件建立成本降低約 50-70%。

### 3.3 游標式串流 (Cursor Streaming)
**決策**：提供 `cursor()` 與 `lazyAll()` 方法。
**原因**：
-   避免處理大量數據（如匯出報表）時 Node.js/Bun Heap OOM（Out of Memory）。
**實作**：
-   利用 Async Generator (`async function*`)。
-   內部自動分頁（Chunking），對使用者呈現為連續串流。
**安全機制**：
-   內建 `safetyCounter` (10,000 chunks) 防止無限迴圈。
-   檢測 Cursor Stuck（Offset 失效）情況。

---

## 4. 風險分析與潛在問題

### 4.1 併發更新風險 (Race Condition)
-   **問題**：`_performUpdate` 僅依賴 `primaryKey` 進行更新，未檢查數據版本。
    ```typescript
    // Model.ts
    await connection.table(...).where(pk, id).update(dirty)
    ```
-   **風險**：若兩個請求同時讀取同一筆資料並修改不同欄位，後寫入者會覆蓋先寫入者的變更（Lost Update）。
-   **建議**：需實作樂觀鎖（Optimistic Locking），在 schema 中增加 `version` 欄位，更新時檢查 `version` 是否一致。

### 4.2 N+1 查詢問題
-   **現況**：
    -   ✅ `eagerLoad` (`with()`) 已實作 `whereIn` 批次查詢，解決了標準的 N+1 問題。
    -   ⚠️ 透過屬性存取懶加載關聯（如 `await user.posts`）時，若在迴圈中執行，仍會產生 N+1。
-   **代碼證據** (`relationships.ts`):
    ```typescript
    // 正確的批次處理
    const query = Related?.query().whereIn(foreignKey!, validParentKeys)
    ```

### 4.3 Upsert 實作不完整
-   **問題**：`QueryBuilder.ts` 中的 `upsert` 方法標註為 "simplified implementation"。
    ```typescript
    // QueryBuilder.ts line 1562
    // This is a simplified implementation
    // Full implementation would use database-specific UPSERT syntax
    const result = await this.insert(values)
    ```
-   **風險**：目前的實作僅執行 `insert`，若遇主鍵衝突會直接拋出錯誤，而非執行更新。這不符合 `upsert` (Update or Insert) 的語意。
-   **建議**：需針對不同 Driver (PG `ON CONFLICT`, MySQL `ON DUPLICATE KEY UPDATE`) 實作真正的 Upsert 語法。

---

## 5. 效能與擴展性

### 5.1 記憶體管理
-   **WeakMap 應用**：`Model` 類別廣泛使用 `WeakMap` 快取 metadata，確保模型類別卸載時能自動回收記憶體。
-   **閒置連線清理**：`ConnectionManager` 內建 `setInterval` 定期清理閒置連線（預設 10 分鐘），防止連線洩漏。

### 5.2 大規模數據處理
-   **自動分塊 (Auto-Chunking)**：`insert` 方法內建分塊邏輯（`calculateOptimalChunkSize`），防止單次 SQL 語句過長導致封包錯誤。
-   **LATERAL Join 優化**：針對 PostgreSQL，`eagerLoad` 會偵測並使用 `LATERAL` join 來優化帶有 `limit/offset` 的關聯查詢（解決每組取 N 筆的高難度 SQL 問題）。

---

## 6. 後續優化建議

1.  **實作 Optimistic Locking** (Priority: High)
    -   在 Model 中引入 `@version` 裝飾器。
    -   在 `save()` 流程中加入版本檢查邏輯。

2.  **完善 Upsert 支援** (Priority: High)
    -   在 `Grammar` 層定義 `compileUpsert` 介面。
    -   在各資料庫 Grammar (Postgres, MySQL, SQLite) 中實作原生語法。

3.  **增加子查詢支援** (Priority: Medium)
    -   目前 `where` 支援 callback 但回傳的是 `QueryBuilder`，語法上可再增強對 `SubQuery` 物件的支援，使複雜查詢更直觀。

4.  **強化型別定義** (Priority: Low)
    -   目前 `QueryBuilder` 內部大量使用 `any` 處理 Driver 差異，建議定義更嚴格的 `DriverContract` 介面。
