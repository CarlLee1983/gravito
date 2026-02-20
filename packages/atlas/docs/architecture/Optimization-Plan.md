# Atlas ORM 核心模組優化分析計畫

> **文件版本**：1.0
> **最後更新**：2026-02-20
> **負責人**：Antigravity Architect

---

## 模組概覽

**定義**：Atlas ORM 是一個專為 Bun 高效能運行時打造，支援 Active Record 與 Fluent Query Builder 模式的資料庫框架。

**核心職責**：
- **流暢查詢構建 (Query Building)**：提供可鏈式呼叫並具備類型安全的 SQL 語句產生器 (`QueryBuilder`)。
- **物件關聯映射 (Model / ActiveRecord)**：透過 ES6 Proxy 阻擋與動態處理屬性，提供自動轉換、關聯延遲加載等能力。
- **表結構快取與管理 (Schema Registry)**：支援開發期的動態嗅探 (JIT) 與生產期的鎖文件 (AOT) 解析，達到全自動化型別守衛。

---

## 技術規格

### 核心類別/介面

#### `QueryBuilder<T>`

**目的**：提供鏈式 API 用以構建各類 SQL 查詢與執行指令。

**主要方法**：

##### `get(): Promise<T[]>`

- **參數**：無
- **回傳值**：返回泛型 `T` 類型的陣列集合。
- **行為**：透過 `getRawResults()` 產生並編譯 SQL 邏輯、攔截 N+1 查詢檢查、尋找結果快取，最終將資料庫原始結果直接回傳（若配合 `Model`，則會在中途被代理並截獲 Hydration 行為）。
- **異常**：如資料庫語法錯誤會直接拋出對應 Database Error。

#### `SchemaRegistry`

**目的**：負責讀取與存儲各個資料表的 Schema 緩存。

**主要方法**：

##### `get(table: string, connection?: string): Promise<TableSchema>`

- **參數**：
  - `table`：表名
  - `connection`：指定資料庫連線名稱
- **回傳值**：包含所有欄位定義的 `TableSchema`。
- **行為**：於 AOT 模式直接回傳鎖文件解析結果；於 JIT 模式則檢測是否存在有效之在記憶體快取，否則呼叫 `sniffer` 實時解析資料庫中的結構。

### 資料流向

1. **輸入階段**：由使用者操作 `Model.query()` 或 `DB.table()` 輸入條件。
2. **處理階段**：`QueryBuilder` 將所有的 WHERE/JOIN 轉換為 SQL 抽象語法結構（CompiledQuery）。
3. **輸出階段**：`Grammar` 轉為對應特定 RDBMS 語言的 SQL 後，透過底層 `Connection` 執行，並由 `Model` 進行 Hydration 打包出物件實例。

---

## 關鍵設計決策

### 決策 1：解決循環相依時使用動態延遲載入 (Dynamic Import/Require)

**問題背景**：`QueryBuilder` 處理關聯時需要存取 `relationships`，而 `Model` 存取關聯也需要與 `QueryBuilder` 產生連結，造成嚴重的循環引用。

**選擇方案**：在 `Model.ts` 與 `QueryBuilder.ts` 中透過 `await import('./relationships')` 與 inline `require(...)` 動態載入。

**理由**：
- 最快解開模組啟動時的 Circular Dependency 僵局。
- 只有在發生 eager-load 與 whereHas 操作時才會觸發解析。

**替代方案**：建立居中的 `Registry` 模式，啟動時主動將所有關係解析邏輯「註冊」進 `Model` 和 `QueryBuilder` 之中，以解耦兩方直接依賴。
**缺點**：動態 `import` 與 `require` 混用可能產生在 ESM 打包下的邊界問題。

---

## 邊際案例與潛在風險分析

根據 `gravito-architect` 的分析標準，以下列出核心模組中潛在的問題，並給予修復方針。

### Critical（必須修正）

1. **Race Condition（競態條件）**：
   - **位置**：`packages/atlas/src/orm/schema/SchemaRegistry.ts:118-140`
   - **現象**：`SchemaRegistry` JIT 模式的 `get()` 方法在啟動瞬間若遇到高並發查詢相同的表，由於沒有 Promise 狀態重用（Deduplication），會產生多次浪費且無鎖保護的 `sniffer.sniff(table)` 請求打入資料庫。
   - **影響**：瞬間產生存取擁堵。
   - **修正建議**：新增一個 map 如 `pendingSniffs: Map<string, Promise<TableSchema>>`。每次欲發動嗅探前，如果在等待隊列已存在，直接 return 該 promise；否則自己執行嗅探並推入 queue 中，完成後 cleanup。

2. **效能瓶頸與 ESM 混用問題**：
   - **位置**：`packages/atlas/src/query/QueryBuilder.ts:1221` 及 `packages/atlas/src/orm/model/Model.ts:998-1004`
   - **現象**：`QueryBuilder` 使用 CommonJS 風格的 `require('../orm/model/relationships')`，在以 ESM 為主（Bun 環境原生支援）的環境中，內聯的同步 require 破壞了模組靜態分析樹，甚至在特定打庫（TSUP/Rollup）過程中會被拒絕。
   - **影響**：部署上可能埋下不可預測的依賴錯誤；熱路徑多次執行可能引發 Module Cache 查找開銷。
   - **修正建議**：將關聯邏輯抽取到 `RelationshipResolver` 介面，透過外部將解析器實例注入至 `QueryBuilder` 或使用依賴反轉（IoC）。

### High（建議修正）

1. **記憶體洩漏風險 (Memory Leak)**：
   - **位置**：`packages/atlas/src/orm/model/Model.ts:163` 
   - **現象**：屬性存取時使用的轉換快取 `private static _studlyCache = new Map<string, string>()` 是沒有尺寸上限的。
   - **影響**：因為 Model 取值大量使用 Proxy，若有外部惡意傳入隨機生成的 key 值，快取內存將無限期生長，最終導致 Out of Memory (OOM)。
   - **修正建議**：改用具備上限的 LRU Cache (例如預設最大 5000 筆) 或在特定數量時執行 `clear()`。

### Medium（可選修正）

1. **無鎖情況下的並發寫入 (Concurrency Write)**：
   - **位置**：`QueryBuilder.ts` (Insert / Update 實作)
   - **現象**：並沒有原生提供 `optimistic lock` 版本。
   - **修正建議**：未來可在 Model 階層掛載自動的 `@Version` 裝飾器機制防禦。

---

## 後續優化建議

### 短期改進 (1-2 週)

1. **修復 JIT Schema 重複嗅探 (Promise Deduplication)**
   - **目的**：防範 Node/Bun 下高並發連線時發生的 Race Condition。
   - **預期效果**：即使同一時間發來 1000 次存取某表的需求，底層也只會執行一次 `DESCRIBE TABLE`。
2. **修正 `_studlyCache` 記憶體溢出風險**
   - **目的**：限制 `Model._studlyCache` 的大小。
   - **預期效果**：避免未經驗證的大量隨機鍵名引發記憶體耗盡。

### 中期重構 (1-3 個月)

1. **移除動態 Require / Import 循環相依**
   - **目的**：穩定 ESM (ECMAScript Modules) 編譯行為並增進效能。
   - **風險評估**：需大幅改動 `QueryBuilder` 及 `Model` 之間注入 `Relationship` Metadata 的方式。

### 長期演進 (6 個月以上)

1. **完善的 Active Record 樂觀鎖與分庫支持**
   - **願景**：讓 Atlas 在高寫入的高可用性場景中具備更高等級的安全預防措施。

---
