# Laravel 資料庫與 ORM 功能與 Atlas 模組：全面對比

本文檔詳細對比 Laravel 原生資料庫與 ORM（Eloquent）功能與 `atlas` TypeScript 模組。目標是識別 `atlas` 提供了哪些等效功能、哪些方面可能不足，並提出改進與優化建議。本文檔將作為未來開發與全面測試 `atlas` 模組的參考，以確保其功能完整性與健壯性。

## 1. Laravel 資料庫與 ORM 簡介

Laravel 作為一個流行的 PHP 框架，透過以下幾個關鍵元件提供強大且富表現力的資料庫互動方式：

*   **資料庫層（Database Layer）：** 提供原始 SQL 查詢、連線與事務等基本功能。
*   **查詢建構器（Query Builder）：** 提供流暢的介面來建構與執行查詢，具備 SQL 注入保護與廣泛的資料操作/檢索方法。
*   **Eloquent ORM：** 物件關聯映射器，將資料表對應到「模型（Models）」，以物件方式管理資料與關係，遵循 Active Record 模式。
*   **遷移（Migrations）與填充（Seeding）：** 管理資料庫 Schema 演進與測試資料填充的工具。
*   **Artisan CLI：** 強大的命令列介面，包含資料庫管理、模型產生等命令。

## 2. `atlas` 模組簡介

`atlas` 模組是 TypeScript ORM，目標是對標 Laravel Eloquent ORM 與查詢建構器，提供熟悉的使用體驗。其主要架構特點與功能包括：

*   **外觀模式（Facade Pattern）：** 使用靜態 `DB` 類別作為外觀，提供全域資料庫操作入口，與 Laravel `DB` 外觀概念相同。
*   **類 Eloquent ORM：** 提供 `Model` 基底類別，支援關係（`HasOne`、`HasMany`、`BelongsTo`、`BelongsToMany`）與 `SoftDeletes` 等功能。
*   **多資料庫支援：** 支援 PostgreSQL、MySQL、SQLite 與 MongoDB，並提供對應驅動。
*   **Schema 建構器：** 基於 `Blueprint` 定義資料表結構，靈感直接來自 Laravel。
*   **完整 CLI（`orbit`）：** 類似 Laravel `artisan` 的命令列工具，支援遷移、填充、模型產生與類 `tinker` 的 REPL。
*   **查詢快取：** 內建查詢快取支援（例如使用 `ioredis`）。

實質上，`atlas` 旨在成為「TypeScript 生態系中的 Laravel Eloquent」。

## 3. 功能對比

本節對比具體功能，說明相似之處、`atlas` 已確認的功能，以及需進一步調查或實作的領域。

### 3.1. 資料庫連線與設定

*   **Laravel：**
    *   支援 MariaDB、MySQL、PostgreSQL、SQLite 與 SQL Server（MongoDB 透過社群套件支援）。
    *   透過 `config/database.php` 與 `.env` 進行設定，支援連線 URL。
    *   讀寫分離與「黏性（sticky）」讀取。
    *   多連線管理。
    *   查詢事件監聽與累計查詢時間監控。
*   **`atlas`：**
    *   **已確認：** 支援 PostgreSQL、MySQL、SQLite 與 MongoDB（透過依賴）。
    *   **已確認：** `DB.ts` 中的 `ConnectionManager` 顯示具備多連線處理能力。
    *   **待調查/實作：** 讀寫分離與黏性讀取、詳細設定選項（超出基本連線字串）、查詢事件監聽與累計查詢時間監控。

### 3.2. 查詢建構器

*   **Laravel：**
    *   流暢鏈式介面，具 SQL 注入保護。
    *   **檢索：** `get`、`first`、`value`、`find`、`pluck`、`exists`、`doesntExist`。
    *   **聚合：** `count`、`max`、`min`、`avg`、`sum`。
    *   **資料處理：** `chunk`、`chunkById`、`lazy`、`lazyById`（處理大型資料集）。
    *   **選擇：** `select`、`selectRaw`、原始表達式。
    *   **連接：** `join`、`leftJoin`、`rightJoin`、`crossJoin`、進階連接、子查詢連接、橫向連接。
    *   **聯集：** `union`、`unionAll`。
    *   **Where 子句：** 完整 `where` 系列（基本、`orWhere`、`whereNot`、`whereAny/All/None`、JSON 查詢、日期/時間、`whereExists`、`whereFullText`）。
    *   **排序/分組/限制：** `orderBy`、`groupBy`、`having`、`limit`、`offset`。
    *   **DML：** `insert`、`update`、`upsert`、`increment`、`decrement`、`delete`。
*   **`atlas`：**
    *   **已確認：** 提供 `DB` 外觀，推測具備基本 CRUD 查詢建構器。
    *   **待確認/實作：**
        *   `value`、`pluck`、分塊與惰性載入等進階檢索方法。
        *   聚合函式完整性。
        *   `selectRaw` 與原始表達式。
        *   所有連接型態（尤其子查詢與橫向連接）。
        *   `union` 操作。
        *   完整 `where` 範圍（含 JSON、日期/時間、`whereExists`、`whereFullText`）。
        *   `upsert` 功能。

### 3.3. Eloquent ORM：入門與模型功能

*   **Laravel：**
    *   模型對應資料表（Active Record）。
    *   表名、主鍵（自增、UUID、ULID）與時間戳慣例。
    *   Artisan 產生模型。
    *   **檢索：** `all`、`get`、`find`、`first`、`where`、`findOrFail`、`firstOrFail`。
    *   **檢索或建立：** `firstOrCreate`、`firstOrNew`。
    *   **插入：** `save`、`create`。
    *   **更新：** `save`、`update`、`updateOrCreate`、`upsert`。
    *   **批次賦值保護：** `$fillable`、`$guarded`。
    *   **模型屬性追蹤：** `isDirty`、`isClean`、`wasChanged`、`getOriginal`、`getChanges`、`getPrevious`。
    *   **軟刪除（Soft Deletes）。**
    *   **查詢作用域（Query Scopes）。**
    *   **模型事件（Model Events）。**
*   **`atlas`：**
    *   **已確認：** `Model` 基底類別、`SoftDeletes`。
    *   **已確認：** `orbit` CLI 用於模型產生。
    *   **極可能（基於 Eloquent 啟發）：** 基本 CRUD 方法（`find`、`first`、`create`、`update`、`delete`）。
    *   **待確認/實作：**
        *   特定主鍵類型（UUID、ULID）。
        *   `findOrFail`、`firstOrFail`、`firstOrCreate`、`firstOrNew`、`updateOrCreate`、`upsert`。
        *   批次賦值保護（對應 `$fillable`、`$guarded`）。
        *   模型屬性變更追蹤（`isDirty`、`wasChanged` 等）。
        *   查詢作用域。
        *   模型生命週期事件。

### 3.4. Eloquent 關係

*   **Laravel：**
    *   **類型：** `hasOne`、`belongsTo`、`hasMany`、`belongsToMany`、`hasOneThrough`、`hasManyThrough`、多型關係（一對一、一對多、多對多）。
    *   關係以模型方法定義，充當查詢建構器。
    *   可自訂外鍵/本地鍵。
    *   “Has One of Many”（`latestOfMany`、`oldestOfMany`、`ofMany`）。
    *   作用域關係。
    *   **多對多樞紐表互動：** `pivot`/`as`、`withPivot`/`withTimestamps`、`wherePivot`、自訂樞紐模型。
    *   **載入：** 預載入（`with`、`load`、`loadMissing`），避免 N+1 問題，防止惰性載入。
    *   插入/更新相關模型。
*   **`atlas`：**
    *   **已確認：** `HasOne`、`HasMany`、`BelongsTo`、`BelongsToMany`。
    *   **已確認：** 多型關係（`MorphTo`、`MorphOne`、`MorphMany`）。
    *   **極可能（基於 Eloquent 啟發）：** 基本關係以方法定義，動態屬性存取。
    *   **待確認/實作：**
        *   `HasOneThrough`、`HasManyThrough`。
        *   “Has One of Many”（例如 `latestOfMany`）。
        *   作用域關係。
        *   多對多樞紐表的完整互動能力。
        *   **已確認：** 預載入機制（`with`）已支援，含多型預載入優化（避免 N+1）。
        *   **待確認/實作：** `load`、`loadMissing`。
        *   生產環境中防止意外惰性載入的機制。
        *   相關模型的級聯插入/更新。

### 3.5. Eloquent 集合

*   **Laravel：**
    *   回傳 `Illuminate\Database\Eloquent\Collection`（繼承 `Illuminate\Support\Collection`）。
    *   豐富 API（`map`、`reduce`、`filter`、`contains`、`fresh`、`load`、`makeVisible`、`makeHidden` 等）。
    *   支援自訂集合類別。
*   **`atlas`：**
    *   **待調查/實作：** 查詢回傳集合型別與 API。考量其啟發來源，可能有類似集合物件，但需明確確認與對照。

### 3.6. 遷移與 Schema 建構器

*   **Laravel：**
    *   `php artisan make:migration`、`migrate`、`migrate:rollback`、`migrate:status`。
    *   `Schema` 外觀用於跨資料庫的 Schema 操作。
    *   `Blueprint` 定義欄位、索引、外鍵與表設定。
*   **`atlas`：**
    *   **已確認：** `orbit` CLI 含 `migrate`。
    *   **已確認：** `Schema` 建構器與 `Blueprint` 定義資料表。
    *   **極可能：** 支援欄位、索引與外鍵。
    *   **待確認/實作：** `Blueprint` 欄位型別、修飾器、外鍵選項與表操作方法的完整範圍需審查；並驗證 `orbit` 回滾功能。

### 3.7. 資料填充（Seeding）

*   **Laravel：**
    *   `php artisan db:seed`、`make:seeder`。
    *   透過 Seeder 產生/填入測試資料。
*   **`atlas`：**
    *   **已確認：** `orbit` CLI 含 `seed`。
    *   **極可能：** 支援建立填充檔並執行。

### 3.8. 測試工具
 
*   **Laravel：**
    *   `TestCase` 基類。
    *   `TestResponse` 提供的流暢斷言（`assertStatus`、`assertJson` 等）。
    *   強大的 Mocking（`Event::fake()`、`Mail::fake()`、`Queue::fake()`）。
*   **`atlas` (gravito-core)：**
    *   **已確認：** `HttpTester` 與 `TestResponse` 流暢斷言（Laravel 風格）。
    *   **待確認/實作：** `Event::fake()` 等 Mocking 系統。

### 3.9. CLI 工具（`artisan` vs `orbit`）

*   **Laravel（Artisan）：**
    *   廣泛命令：`make:model`、`make:migration`、`db:seed`、`tinker`、`db:monitor`、`db:table`、`db:show` 等。
*   **`atlas`（`orbit`）：**
    *   **已確認：** `migrate`、`make:model`、`seed`、`tinker` REPL。
    *   **待確認/實作：** 其他資料庫檢視/監控命令，對齊 `artisan` 的便利性。

### 3.10. 事務

*   **Laravel：**
    *   `DB::transaction`（閉包，自動提交/回滾）。
    *   手動事務（`beginTransaction`、`commit`、`rollBack`）。
*   **`atlas`：**
    *   **已確認：** `DB` 外觀提供 `transaction`。
    *   **待確認/實作：** 事務 API 細節，是否同時支援閉包式與手動控制。

### 3.10. 快取

*   **Laravel：**
    *   通用快取系統，可與查詢整合（如 `remember()`）。
*   **`atlas`：**
    *   **已確認：** 內建 `ioredis` 查詢快取支援。
    *   **待調查：** 啟用/設定 API，以及細粒度控制（如快取時間、標籤）。

## 4. `atlas` 已識別差距與優化領域

基於此對比，`atlas` 若要達成 Laravel Eloquent 功能對等，可能的差距與優化方向如下：

1.  **讀寫連線分離：** 支援獨立讀寫連線與黏性讀取。
2.  **進階查詢建構器功能：**
    *   完整 `where` 子句（JSON、日期/時間、`whereFullText`）。
    *   子查詢與橫向連接。
    *   `upsert`。
    *   進階檢索方法（`value`、`pluck`、分塊、惰性載入）。
3.  **完整模型功能：**
    *   UUID/ULID 主鍵。
    *   `findOrFail`、`firstOrFail` 與「查找或建立/更新」系列方法。
    *   完整批次賦值保護（對應 `$fillable`、`$guarded`）。
    *   模型屬性變更追蹤（`isDirty`、`wasChanged`）。
    *   查詢作用域。
    *   完整模型生命週期事件（鉤子）。
4.  **關係增強：**
    *   `HasOneThrough`、`HasManyThrough`。
    *   “Has One of Many”（如 `latestOfMany`）。
    *   作用域關係。
    *   `belongsToMany` 的樞紐表完整互動（`withPivot`、`wherePivot`、自訂樞紐模型）。
    *   `load`、`loadMissing` 方法支撐。
    *   生產環境防止意外惰性載入的機制。
5.  **類 Eloquent 集合：**
 建立具完整 API 的集合類別，對齊 `Illuminate\Support\Collection` 體驗。
