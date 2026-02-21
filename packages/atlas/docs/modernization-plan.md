# Atlas ORM 模組現代化演進計畫 (Modernization Plan)

本計畫基於 Atlas ORM 當前具備的 Active Record、Smart Guard 與水平分片 (Sharding) 的基礎架構，針對現代 TS ORM (如 Drizzle, Prisma, Laravel Eloquent) 的主流趨勢，提出分階段的架構升級與實作指南。

---

## 📅 Roadmap 總覽

| 階段 | 週期 (估計) | 核心目標 | 狀態 |
| :--- | :--- | :--- | :---: |
| **Phase 1: Performance & Scale** | 2-3 週間 | 讀寫分離 (Read/Write Replicas)、游標分頁 (Cursor Pagination) | 🔜 待啟動 |
| **Phase 2: Types & DX** | 3-4 週間 | Schema 型別生成器 (Type Generator)、自動化遷移指引 (Migration Diff) | ⏸ 規劃中 |
| **Phase 3: Deep Relations & NoSQL** | 1-2 週間 | 巢狀預載入 (Deep Eager Loading)、原生 JSON/Spatial 查詢 | ⏸ 規劃中 |

---

## 🛠️ Phase 1: 效能與擴展性 (Performance & Scale)

此階段聚焦於高併發系統中最急迫需要的資料庫效能優化。

### 1-A. 讀寫分離 (Read/Write Replicas)

**目標：** 在底層連線池與 `QueryBuilder` 層級原生支援多資料庫主從架構。

**實作思路 / 架構修改：**
1. **Config 定義層** (`packages/atlas/src/types`):
   擴充 `ConnectionConfig` 介面，支援提供 `write` 與 `read` 陣列節點連線。
   ```typescript
   export interface ConnectionConfig {
     write: DatabaseConfig;
     read: DatabaseConfig[];
     // ...
   }
   ```
2. **連線池層** (`packages/atlas/src/pool/ConnectionPool.ts`):
   建立 Round-robin 輪詢機制來隨機挑選 Read Replica。
3. **Query Builder 層** (`packages/atlas/src/query/QueryBuilder.ts`):
   - 在決定連線時，判斷如果是 `select` 預設分發至 `read` pool。
   - `fetch()` 走 read，而 `insert()`, `update()`, `delete()` 走 write。
   - 提供 `useWriteOnce()` 或 `DB.connection('default').write()` 的強制走主庫 API，避免延遲。

### 1-B. 游標分頁 (Cursor Pagination)

**目標：** 提供巨量資料下的 O(1) 分頁查詢方式。

**實作思路 / 架構修改：**
1. **Query Builder API** (`packages/atlas/src/query/QueryBuilder.ts`):
   新增 `.cursorPaginate(limit: number, cursor?: string)` 方法。
2. **游標編碼** (`packages/atlas/src/utils/CursorEncoding.ts`):
   - 實作 base64 游標編碼/解碼（通常編碼包含排序欄位的值與 Primary Key，例如 `{ id: 12345, created_at: "2026-01-01" }`）。
3. **AST 條件改寫**:
   當解碼游標後，動態注入 `WHERE (sort_col, id) > (val1, val2)` 的 Tuple Comparison 條件（相容 Postgres / MySQL）。

---

## 🧠 Phase 2: 型別安全與開發體驗 (Types & DX)

此階段是對標 Prisma 與 Drizzle 最核心的「型別即真理」體驗。

### 2-A. Schema 自動化型別生成 (Type Generator)

**目標：** 徹底消滅 `declare id: number` 這種人為定義所帶來的 Type Drift，實現型別 100% 來自 Schema 或 Decorator 的推導。

**實作思路 / 架構修改：**
1. **指令介面** (`packages/atlas/src/cli.ts`):
   開發 `bun orbit generate:types` 命令。
2. **Schema 讀取策略**: 
   - 讀取已編譯的 Entity class 中的 `@column` Decorator 屬性，或直接連線到 DB 解析 `information_schema`。
3. **產生輸出檔案**:
   - 掃描專案，輸出到類似 `.orbit/generated.d.ts` 或對應 Model 目錄的 `types.ts` 中。
   - Model 本身不宣告型別，而是透過 `interface User extends GeneratedUser {}` 的方式實作 Declaration Merging。

### 2-B. 自動化資料庫遷移引擎 (Migration Diff / Schema Push)

**目標：** 類似 `drizzle-kit push` 或 `prisma db push`，不再手寫 SQL 遷移檔。

**實作思路 / 架構修改：**
1. **Schema 狀態比對** (`packages/atlas/src/schema/SchemaDiff.ts`):
   比較 Model 中定義的 @column, @index 與當下資料庫內部的 Schema 狀態。
2. **變更命令生成**:
   - 偵測到新增/刪除/修改欄位，生成對應的 `ALTER TABLE ...` 指令（需相容各資料庫種類的 Dialect）。
3. **CLI 整合**:
   - `bun orbit db:push`：直接執行同步。
   - `bun orbit migrate:generate`：將 Diff 匯出成手動的 Migration 腳本檔。

---

## 🔌 Phase 3: 深層關聯預載 & 高階查詢 (Deep Eager Loading & NoSQL)

此階段使複雜資料結構的操作更加優雅。

### 3-A. 巢狀關聯與條件式預載 (Deep / Conditional Eager Loading)

**目標：** 讓 `with()` 支援如 Graph 般的巢狀載入與局部查詢。

**實作思路 / 架構修改：**
1. **點標記法解析** (`packages/atlas/src/orm/model/relationships.ts`):
   支援 `with('posts.comments.author')` 的 Dot-notation。
   解析為 AST 樹狀結構，逐層執行 `IN (...)` 查詢。
2. **條件式載入**:
   容許傳遞閉包來動態修改載入關聯時的 QueryBuilder。
   ```typescript
   User.with({ posts: (q) => q.where('is_published', true).limit(5) })
   ```

### 3-B. 原生 JSON 查詢與空間運算 (JSON & Spatial)

**目標：** 提煉特定的 RDBMS 強項給使用者。

**實作思路 / 架構修改：**
1. **JSON Operator**:
   擴展 Query Builder 支援 `whereJsonContains('settings->theme', 'dark')`。
   在 Postgres 驅動內轉寫為 `settings->'theme' @> '"dark"'`；MySQL 轉為 `JSON_CONTAINS(...)`。
2. **Spatial Operators**:
   支援 `whereDistanceWithin('location', point, distance)` 供快速開發 LBS 應用。

---

## 🛫 準備實作工作 (To-Do Checklist)

若決定啟動實作，建議依序建立獨立的 Git 分支 (Feature branches)，以確保框架穩定性：

- [ ] `feat/atlas-read-write-replicas`：實作資料庫主從連線池與自動路由。
- [ ] `feat/atlas-cursor-pagination`：新增 Cursor 分頁器，提供 O(1) 效能查詢。
- [ ] `feat/atlas-type-generator`：建構 CLI 工具擷取 Schema 並匯出 `d.ts` 型別定義檔。
- [ ] `feat/atlas-schema-diff`：實作 DB Schema 與 Decorator Schema 的比對引擎。
- [ ] `feat/atlas-deep-eager-loading`：重構 Relationships 解析層，強化 `with()` 能力。
