# Bun SQL 快速參考指南

**用途**: 快速查閱 gravito 框架的 Bun SQL 支援狀況
**更新日期**: 2026-02-23

---

## 🎯 一頁式概覽

### ✅ 當前支援

```typescript
import { Database } from 'bun:sqlite'
import { getConnection } from '@gravito/atlas'

const db = await getConnection('sqlite')

// 1️⃣ 基本查詢
const users = await db.query('SELECT * FROM users WHERE id = ?', [1])

// 2️⃣ Prepared Statements (自動快取)
const stmtId = await db.driver.prepare('SELECT * FROM users WHERE id = ?')
const result = await db.driver.executePrepared(stmtId, [1])

// 3️⃣ 交易
await db.transaction(async (tx) => {
  await tx.execute('INSERT INTO users VALUES (?)', [data])
  await tx.execute('UPDATE posts SET views = views + 1')
})

// 4️⃣ 批次操作 (待優化)
for (const record of records) {
  await db.table('users').insert(record)
}

// 5️⃣ 連接池監控
const stats = db.driver.getPoolStats()
// → { idle: 2, pending: 0, active: 3, total: 5, max: 10 }
```

### ❌ 尚未支援

```typescript
// 1️⃣ Tagged Template Literals
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`
// → 尚未實現 (P1 優先級)

// 2️⃣ Bulk Operations 最佳化
await db.table('users').insertBulk([
  { name: 'Alice', email: 'a@example.com' },
  { name: 'Bob', email: 'b@example.com' }
])
// → 目前逐行插入 (P2 優先級)

// 3️⃣ Result 格式選項
const values = await db.sql`SELECT ...`.values()  // Array format
const raw = await db.sql`SELECT ...`.raw()        // Buffer format
// → 固定對象格式 (P3)

// 4️⃣ Savepoint 支援
const tx = await db.transaction('savepoint_name')
await tx.rollbackTo('savepoint_name')
// → 尚未實現 (P2 優先級)
```

---

## 📊 性能特性對標

### SQLite 效能

| 操作 | 預期耗時 | 備註 |
|------|--------|------|
| Simple SELECT | 245 µs | Bun native 優化 |
| SELECT with WHERE | 253 µs | Prepared stmt 快取 |
| INSERT single | 187 µs | WAL 模式 |
| Prepared (cold) | 312 µs | 第一次準備 |
| Prepared (warm) | 156 µs | 快取命中 ⬇️ 50% |

### 連接池效能

| 場景 | 預期耗時 | 備註 |
|------|--------|------|
| 10 concurrent | 450 µs | 非同步池 |
| 50 concurrent | 2.1 ms | 池飽和 |
| Pool hitRate | 99.8% | LRU 快取有效 |

---

## 🚀 最佳實踐

### 1. 使用 Prepared Statements 重複查詢

```typescript
// ✅ 好: 準備一次，多次使用
const stmtId = await db.driver.prepare(
  'SELECT * FROM users WHERE id = ?'
)

for (const userId of userIds) {
  const result = await db.driver.executePrepared(stmtId, [userId])
}

// ❌ 不好: 每次都解析
for (const userId of userIds) {
  const result = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )
}
```

### 2. 使用交易批量修改

```typescript
// ✅ 好: 單一交易
const results = await db.transaction(async (tx) => {
  const user = await tx.insert('users', userData)
  await tx.insert('audit_logs', {
    action: 'user_created',
    userId: user.id
  })
  return user
})

// ❌ 不好: 各自獨立查詢
const user = await db.insert('users', userData)
await db.insert('audit_logs', { ... })
```

### 3. 連接池大小配置

```typescript
// ✅ 根據負載調整
const connection = await getConnection('postgres', {
  pool: {
    max: 20,                    // 併發工作的 1-2 倍
    idleTimeout: 30000          // 30 秒空閒釋放
  }
})
```

---

## 📈 優化路線圖 (近期)

### Phase 1: 基礎優化 (週 1-2)

| 項目 | 改進 | ETA | 優先級 |
|------|------|-----|------|
| Tagged Template Literals | 5-8% 安全性 | Week 1 | 🔴 |
| 性能基準測試 | 工具化 | Week 1 | 🔴 |
| LRU 快取優化 | O(1) 驅逐 | Week 2 | 🔴 |

### Phase 2: 功能擴展 (週 3)

| 項目 | 改進 | ETA | 優先級 |
|------|------|-----|------|
| 連接池動態調整 | 10-15% | Week 3 | 🟡 |
| Bulk Operations | 20-30% 批量 | Week 3 | 🟡 |
| Savepoint 支援 | 功能完整 | Week 3 | 🟡 |

---

## 🔧 常見工作流

### 場景 1: 構建 CRUD API

```typescript
// users.ts - User CRUD
export async function getUser(id: number) {
  return db.table('users')
    .where('id', id)
    .first()
}

export async function createUser(data: CreateUserDTO) {
  return db.table('users').insert(data)
}

export async function updateUser(id: number, data: UpdateUserDTO) {
  return db.table('users')
    .where('id', id)
    .update(data)
}

export async function deleteUser(id: number) {
  return db.table('users')
    .where('id', id)
    .delete()
}
```

### 場景 2: 複雜交易

```typescript
// Transfer funds between accounts
export async function transferFunds(
  fromId: number,
  toId: number,
  amount: number
) {
  return db.transaction(async (tx) => {
    // 檢查餘額
    const from = await tx.query(
      'SELECT balance FROM accounts WHERE id = ? FOR UPDATE',
      [fromId]
    )

    if (from[0].balance < amount) {
      throw new Error('Insufficient funds')
    }

    // 扣款
    await tx.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    )

    // 入款
    await tx.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    )

    // 記錄
    await tx.insert('transactions', {
      from_id: fromId,
      to_id: toId,
      amount,
      created_at: new Date()
    })
  })
}
```

### 場景 3: 批量導入

```typescript
// Batch import (待優化 - 目前逐行)
export async function importUsers(file: File) {
  const csv = await file.text()
  const records = parseCSV(csv)

  // 目前: ❌ 逐行插入 (低效)
  for (const record of records) {
    await db.table('users').insert(record)
  }

  // 未來: ✅ Bulk insert
  // await db.table('users').insertBulk(records)
}
```

---

## 🐛 常見問題

### Q1: Prepared Statement 快取工作方式？

**A**: LRU (Least Recently Used) 快取

```typescript
const manager = db.driver.preparedManager

// 新準備的語句自動快取
const stmt1 = await manager.prepare('SELECT * FROM users WHERE id = ?')
const stmt2 = await manager.prepare('SELECT * FROM users WHERE id = ?')

console.log(stmt1 === stmt2)  // true ✅ 快取命中
```

**快取策略**:
- 最大 100 個語句 (可配置)
- 60 秒閒置超時自動釋放
- LRU 驅逐当滿時

### Q2: 如何優化批量插入？

**A**: 目前的方案

```typescript
// 方案 1: 分組交易
const chunkSize = 100
for (let i = 0; i < records.length; i += chunkSize) {
  const chunk = records.slice(i, i + chunkSize)
  await db.transaction(async (tx) => {
    for (const record of chunk) {
      await tx.insert('users', record)
    }
  })
}

// 方案 2: 原始 SQL (手動)
const values = records.map(r => `('${r.name}', '${r.email}')`).join(',')
await db.query(`INSERT INTO users (name, email) VALUES ${values}`)

// 未來 (Week 3): 使用 insertBulk()
// await db.table('users').insertBulk(records)
```

### Q3: 連接池應設多大？

**A**: 根據並發工作數

```
推薦池大小 = (平時並發數) + 20% 緩衝

例如:
- 低流量 (10 並發) → pool.max = 12
- 中流量 (50 並發) → pool.max = 60
- 高流量 (200 並發) → pool.max = 240
```

監控:
```typescript
const stats = db.driver.getPoolStats()
console.log(`Pool: ${stats.active}/${stats.total} (${stats.pending} pending)`)

// 告警條件:
// - active/total > 0.9 (90% 以上飽和) → 增加池大小
// - pending > 0 → 池大小不足
```

### Q4: 何時使用 SQLite vs PostgreSQL？

| 場景 | 推薦 | 原因 |
|------|------|------|
| 本地開發 | SQLite | 簡單、無需配置 |
| 小應用 (<10K QPS) | SQLite | 效能足夠 |
| 多進程應用 | PostgreSQL | SQLite 鎖定問題 |
| 分佈式系統 | PostgreSQL | 複製、高可用 |
| 實時分析 | PostgreSQL | 查詢優化 |

---

## 📚 相關文檔

- 詳細分析: [BUN_SQL_NATIVE_SUPPORT_ANALYSIS.md](./BUN_SQL_NATIVE_SUPPORT_ANALYSIS.md)
- 實施計劃: [BUN_SQL_OPTIMIZATION_ROADMAP.md](./BUN_SQL_OPTIMIZATION_ROADMAP.md)
- 官方文檔: https://bun.com/docs/runtime/sql
- Atlas 文檔: ../../packages/atlas/README.md

---

## 🤝 貢獻與反饋

發現問題或有改進建議？

1. 開啟 Issue: https://github.com/gravito-framework/gravito/issues
2. 提交 PR: https://github.com/gravito-framework/gravito/pulls
3. 討論區: https://github.com/gravito-framework/gravito/discussions

---

**最後更新**: 2026-02-23
**維護者**: Gravito Team
**版本**: 1.0
