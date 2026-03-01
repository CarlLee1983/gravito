---
title: Table Partitioning
description: Deep dive into Atlas ORM's horizontal and vertical partitioning mechanisms for high-scale data management.
---

# Table Partitioning

As your application grows to millions or billions of records, or when a single table has too many columns (wide table), performance of a single physical table will significantly degrade. Atlas ORM provides robust, automated support for both **Horizontal Partitioning** and **Vertical Partitioning**.

---

## Horizontal Partitioning

Horizontal partitioning distributes data of the same Model across multiple physical tables (e.g., `logs_202603`, `logs_202604`) based on specific rules like time or hash values.

### 1. Define Partition Strategy

Specify a `partitionStrategy` in your Model. Atlas comes with several built-in strategies:

```typescript
import { Model, MonthlyPartitionStrategy, type Blueprint } from '@gravito/atlas'

class ActivityLog extends Model {
  static table = 'activity_logs'
  
  // Use monthly partitioning strategy
  static partitionStrategy = new MonthlyPartitionStrategy()
  
  // Define column template for partitioned tables (used for auto-provisioning)
  static partitionTemplate = (table: Blueprint) => {
    table.id()
    table.string('action')
    table.json('payload').nullable()
    table.timestamps()
  }
}
```

### 2. Writing and Auto-Provisioning

Use the `partition()` method to target a specific physical table. If the table does not exist yet, Atlas will **automatically create** it using the `partitionTemplate` and retry the operation.

```typescript
// Automatically writes to activity_logs_202603
await ActivityLog.partition(new Date()).insert({
  action: 'user_login',
  payload: { ip: '127.0.0.1' }
})
```

### 3. Cross-Partition Union Queries

When you need to query data across multiple months, pass an array of keys. Atlas will automatically generate an efficient `UNION ALL` query.

```typescript
// Query all logs from January and February
const logs = await ActivityLog.partition([
  new Date('2026-01-01'),
  new Date('2026-02-01')
]).orderBy('created_at', 'desc').get()
```

---

## Vertical Partitioning

Vertical partitioning splits a "wide table" into a "core table" and an "extension table." Moving infrequently queried large columns (like `TEXT`, `JSONB`) to an extension table improves index scan and buffer pool efficiency.

### 1. Define Extension Table and Deferred Columns

Use the `extensionTable` property and the `@deferred()` decorator.

```typescript
import { Model, column, deferred } from '@gravito/atlas'

class Product extends Model {
  static table = 'products'
  static extensionTable = 'product_details' // Extension table name

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @deferred() // Mark as deferred, stored in product_details
  declare description: string

  @deferred()
  declare metadata: any
}
```

### 2. Transparent I/O

- **Query Optimization**: Default queries exclude `@deferred` columns (`SELECT id, name`), reducing I/O.
- **Lazy/Explicit Loading**: When using `withDeferred()`, Atlas automatically performs a `LEFT JOIN` to fetch the extension table data.
- **Automatic Persistence**: Calling `save()` automatically distributes attributes between the two tables, wrapped in a single Transaction.

```typescript
// List query (Fast, excludes large columns)
const list = await Product.query().get()

// Detail query (Auto JOIN extension table)
const detail = await Product.query().withDeferred().find(1)

// Save (Auto-distributes to products and product_details)
const p = Product.make({ name: 'iPhone 17', description: '...' })
await p.save()
```

---

## Best Practices

1.  **Vertical then Horizontal**: If a table is both wide and large, split it vertically first to shorten row length, then partition horizontally.
2.  **Global Unique IDs**: Avoid relying on database auto-increment IDs after partitioning. Use **Snowflake IDs** or **UUIDs** instead.
3.  **Index Design**: Indexes are independent for each partition. Ensure each partition table has the necessary indexes for your queries.
