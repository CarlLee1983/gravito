---
title: 分表策略 (Table Partitioning)
description: 深入了解 Atlas ORM 的水平與垂直分表機制，應對巨量資料與高併發場景。
---

# 分表策略 (Table Partitioning)

當您的應用程式資料量達到百萬、甚至億級，或是單張表的列數過多（寬表）時，單一物理表的效能將會顯著下降。Atlas ORM 提供了強大的自動化分表支援，包含**水平分表 (Horizontal Partitioning)** 與 **垂直分表 (Vertical Partitioning)**。

---

## 水平分表 (Horizontal Partitioning)

水平分表是將同一個 Model 的資料，根據特定規則（如時間、雜湊值）分散存放到多個物理表中（例如 `logs_202603`, `logs_202604`）。

### 1. 定義分表策略

在 Model 中指定 `partitionStrategy`。Atlas 內建了多種策略：

```typescript
import { Model, MonthlyPartitionStrategy, type Blueprint } from '@gravito/atlas'

class ActivityLog extends Model {
  static table = 'activity_logs'
  
  // 使用按月分表策略
  static partitionStrategy = new MonthlyPartitionStrategy()
  
  // 定義分區表的欄位範本（用於自動建表）
  static partitionTemplate = (table: Blueprint) => {
    table.id()
    table.string('action')
    table.json('payload').nullable()
    table.timestamps()
  }
}
```

### 2. 寫入與自動建表 (Auto-Provisioning)

您可以使用 `partition()` 方法定位到特定的物理表。如果該表尚未存在，Atlas 會根據 `partitionTemplate` **自動建立**它並重試操作。

```typescript
// 自動寫入到 activity_logs_202603
await ActivityLog.partition(new Date()).insert({
  action: 'user_login',
  payload: { ip: '127.0.0.1' }
})
```

### 3. 跨分區聚合查詢 (Union Query)

當需要同時查詢多個月份的資料時，可以傳入陣列。Atlas 會自動生成高效的 `UNION ALL` 查詢。

```typescript
// 查詢 1 月與 2 月的所有日誌
const logs = await ActivityLog.partition([
  new Date('2026-01-01'),
  new Date('2026-02-01')
]).orderBy('created_at', 'desc').get()
```

---

## 垂直分表 (Vertical Partitioning)

垂直分表是將一張「寬表」拆分為「核心表」與「擴展表」。將不常查詢的大欄位（如 `TEXT`, `JSONB`）移至擴展表，以提升索引掃描與緩衝區的效率。

### 1. 定義擴展表與延遲欄位

使用 `extensionTable` 屬性與 `@deferred()` 裝飾器。

```typescript
import { Model, column, deferred } from '@gravito/atlas'

class Product extends Model {
  static table = 'products'
  static extensionTable = 'product_details' // 擴展表名

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @deferred() // 標記為延遲載入欄位，儲存於 product_details
  declare description: string

  @deferred()
  declare metadata: any
}
```

### 2. 透明化讀寫

- **查詢優化**：預設查詢不會抓取 `@deferred` 欄位（`SELECT id, name`），減少 I/O。
- **延遲載入**：使用 `withDeferred()` 時，Atlas 會自動執行 `LEFT JOIN` 抓取擴展表資料。
- **自動儲存**：呼叫 `save()` 時，Atlas 會自動將資料分發到兩張表，並確保在同一個交易 (Transaction) 中完成。

```typescript
// 列表查詢 (極快，不包含大欄位)
const list = await Product.query().get()

// 詳情查詢 (自動 JOIN 擴展表)
const detail = await Product.query().withDeferred().find(1)

// 儲存 (自動分發到 products 與 product_details)
const p = Product.make({ name: 'iPhone 17', description: '...' })
await p.save()
```

---

## 最佳實踐建議

1.  **先垂直後水平**：若表既寬又大，建議先進行垂直拆分縮短 Row 長度，再進行水平分區。
2.  **唯一 ID**：分表後請避免依賴資料庫自增 ID，建議改用 **Snowflake ID** 或 **UUID**。
3.  **索引設計**：分表後，每個分區表的索引是獨立的，請確保每個分區表都具備必要的查詢索引。
