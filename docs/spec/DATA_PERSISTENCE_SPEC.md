# 🗄️ Gravito Data Persistence Specification (GDPS)

本文件定義了 Gravito 生態系中數據持久化層（Persistence Layer）的開發標準，旨在確保數據一致性、查詢效能以及符合 **Galaxy Architecture** 的分層規範。

## 1. 核心持久化原則 (Core Principles)

### 1.1 分層責任 (Layer Responsibility)
- **Domain Layer**: 定義 `Entity` 與 `Repository Interface`。禁止在此層引用任何資料庫實作。
- **Infrastructure Layer**: 實作 `Atlas Repository`。所有的 SQL 邏輯、查詢優化（Query Optimization）必須封裝在此。
- **Application Layer**: 透過注入介面調用 Repository。

### 1.2 查詢防禦 (Query Defense)
- **N+1 預防**: 在 `UseCase` 中嚴禁對集合進行循環查詢。
- **標準做法**: 必須在 Repository 實作中利用 Atlas 的 `.with()` 進行渴求式加載 (Eager Loading)。

## 2. Atlas Model 規範

### 2.1 標準欄位
所有 Satellite 的資料表必須預設包含以下欄位：
- `id`: `uuid` 或 `bigint` (主鍵)。
- `created_at`: `timestamp`。
- `updated_at`: `timestamp`。
- `deleted_at`: `timestamp` (選配，若需軟刪除)。

### 2.2 嚴格模式 (Strict Mode)
- 所有 Model 預設必須開啟 `static strictMode = true`，防止寫入未定義的欄位。
- 必須定義 `@column` 裝飾器以確保類型安全與自動類型轉換（Casting）。

## 3. 遷移規範 (Migrations)

### 3.1 目錄結構
遷移檔案應位於衛星模組的以下路徑：
`src/Infrastructure/Persistence/Migrations/`

### 3.2 命名慣例
`YYYY_MM_DD_HHMMSS_create_table_name.ts`

### 3.3 回滾保證 (Rollback)
每個遷移檔案的 `down()` 方法必須精確還原 `up()` 方法所做的變更，確保 CI/CD 環境中的測試回滾能力。

## 4. 事務管理 (Transactions)

### 4.1 跨表操作
涉及兩張表以上的寫入操作，必須封裝在 `DB.transaction(async (db) => { ... })` 中。

### 4.2 併發衝突
對於高頻更新欄位（如庫存、餘額），建議採用以下模式：
- **樂觀鎖 (Optimistic Locking)**: 利用 `@column({ version: true })` 進行版本控制。
- **原子更新**: 使用 `db.table(...).increment(...)` 而非在記憶體中計算後寫回。

## 5. 性能檢查清單 (Performance Checklist)

- [ ] 是否所有外鍵欄位都建立了索引？
- [ ] 跨衛星查詢是否已轉換為 Event-driven 或 Eager Loading？
- [ ] 大數據量查詢是否使用了 `.cursor()` 或 `.lazyAll()`？
- [ ] 是否在本地開發環境啟用了 `DEBUG_ATLAS=true` 進行查詢分析？

---
*Created by Gravito Data Team.*
