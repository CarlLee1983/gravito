# Atlas Pessimistic Locking API 設計

**日期**：2026-04-17
**套件**：`@gravito/atlas`
**狀態**：Design approved, pending implementation plan
**作者**：Carl Lee

---

## 1. 背景與動機

Atlas 作為 Gravito 的 ORM 套件，目前在 Grammar 層有 `compileLock(mode: 'update' | 'share')` 的雛形（MySQL 輸出 `LOCK IN SHARE MODE`，Postgres 輸出 `FOR SHARE`），但：

- **Grammar.compileSelect 從未呼叫 compileLock**，lock 子句實際上**完全沒被拼接**到 SQL
- **QueryBuilder 層沒有對應 public API**（`forUpdate()`、`sharedLock()` 等）
- **CompiledQuery 型別沒有 lock 欄位**
- **無 `NOWAIT` / `SKIP LOCKED` 支援**
- **SQLite Grammar 沒有 compileLock 實作**

本設計新增完整的 pessimistic locking API，支援 4 個方法：`forUpdate()`、`sharedLock()`、`noWait()`、`skipLocked()`，並修復 Grammar 既有缺陷。

## 2. 設計決策摘要

| # | 主題 | 決策 | 理由 |
|---|---|---|---|
| 1 | SQLite 行為 | **混合策略** | forUpdate/sharedLock 靜默忽略（SQLite `BEGIN IMMEDIATE` 已提供獨占語義），noWait/skipLocked 拋錯（語義不可替代） |
| 2 | API 鏈式組合 | **強制順序** | `noWait`/`skipLocked` 必須在 `forUpdate`/`sharedLock` 後呼叫，否則 runtime 拋錯 |
| 3 | noWait + skipLocked | **拋錯（互斥）** | 同時出現通常是邏輯錯誤，靜默覆蓋會掩蓋 bug |
| 4 | MySQL 相容性 | **只支援 8.0+** | MySQL 5.7 已 EOL（2023-10）；現有 `LOCK IN SHARE MODE` 改為 `FOR SHARE` |
| 5 | 非 Transaction 處理 | **Dev warning log** | 透過 `connection.inTransaction()` 偵測；Prod 沉默；不阻斷執行 |

## 3. 型別定義

```ts
// packages/atlas/src/types/query.ts

export type LockMode = 'update' | 'share'
export type LockModifier = 'noWait' | 'skipLocked'

export interface LockClause {
  mode: LockMode
  modifier?: LockModifier
}

export interface CompiledQuery {
  // ... existing fields
  lock?: LockClause
}
```

`QueryBuilderContract<T>` 新增 4 個方法：

```ts
interface QueryBuilderContract<T> {
  /** Acquire exclusive row lock (FOR UPDATE). Must be in transaction. */
  forUpdate(): this

  /** Acquire shared row lock (FOR SHARE). Must be in transaction. */
  sharedLock(): this

  /** Fail immediately if rows are locked. Must follow forUpdate() or sharedLock(). */
  noWait(): this

  /** Skip rows currently locked by others. Must follow forUpdate() or sharedLock(). */
  skipLocked(): this
}
```

## 4. QueryBuilder 實作

```ts
// packages/atlas/src/query/QueryBuilder.ts

export class QueryBuilder<T> implements QueryBuilderContract<T> {
  protected lockClause?: LockClause

  forUpdate(): this {
    this.lockClause = { mode: 'update' }
    return this
  }

  sharedLock(): this {
    this.lockClause = { mode: 'share' }
    return this
  }

  noWait(): this {
    if (!this.lockClause) {
      throw new QueryBuilderError(
        'noWait() must be called after forUpdate() or sharedLock()'
      )
    }
    if (this.lockClause.modifier === 'skipLocked') {
      throw new QueryBuilderError(
        'Cannot combine noWait() and skipLocked() — they are mutually exclusive'
      )
    }
    this.lockClause = { ...this.lockClause, modifier: 'noWait' }
    return this
  }

  skipLocked(): this {
    if (!this.lockClause) {
      throw new QueryBuilderError(
        'skipLocked() must be called after forUpdate() or sharedLock()'
      )
    }
    if (this.lockClause.modifier === 'noWait') {
      throw new QueryBuilderError(
        'Cannot combine noWait() and skipLocked() — they are mutually exclusive'
      )
    }
    this.lockClause = { ...this.lockClause, modifier: 'skipLocked' }
    return this
  }
}
```

**關鍵行為：**

- `forUpdate()` / `sharedLock()` **可互相覆蓋**（支援動態查詢建構）
- 覆蓋 lock mode 時**清除 modifier**（避免 `forUpdate().noWait().sharedLock()` 意外保留 `noWait`）
- 使用既有 `QueryBuilderError` 類別，不新增錯誤類別
- 遵守 immutability 原則（展開運算子建立新物件）

## 5. Grammar 實作

### 5.1 Grammar 基類

```ts
// packages/atlas/src/grammar/Grammar.ts

export abstract class Grammar {
  /** Optional lock compilation — subclasses override if supported. */
  compileLock?(lock: LockClause): string

  compileSelect(query: CompiledQuery): string {
    // ... existing parts assembly up to offset

    if (query.offset !== undefined) {
      parts.push(this.compileOffset(query))
    }

    // 新增：lock 子句（位置在 offset 之後）
    if (query.lock && this.compileLock) {
      const lockSql = this.compileLock(query.lock)
      if (lockSql) parts.push(lockSql)
    }

    // ... cache handling
  }

  public getStructuralKey(query: CompiledQuery): string {
    // ... existing key assembly

    // 新增：lock 狀態納入 cache key（避免錯誤 cache 命中）
    keyParts.push(
      query.lock ? `${query.lock.mode}:${query.lock.modifier ?? ''}` : ''
    )

    return keyParts.join('|')
  }
}
```

### 5.2 PostgresGrammar

```ts
compileLock(lock: LockClause): string {
  const base = lock.mode === 'share' ? 'FOR SHARE' : 'FOR UPDATE'
  if (lock.modifier === 'noWait') return `${base} NOWAIT`
  if (lock.modifier === 'skipLocked') return `${base} SKIP LOCKED`
  return base
}
```

### 5.3 MySQLGrammar（含 breaking change）

```ts
compileLock(lock: LockClause): string {
  // MySQL 8.0+：FOR SHARE 取代舊的 LOCK IN SHARE MODE
  const base = lock.mode === 'share' ? 'FOR SHARE' : 'FOR UPDATE'
  if (lock.modifier === 'noWait') return `${base} NOWAIT`
  if (lock.modifier === 'skipLocked') return `${base} SKIP LOCKED`
  return base
}
```

### 5.4 SQLiteGrammar

```ts
compileLock(lock: LockClause): string {
  if (lock.modifier === 'noWait' || lock.modifier === 'skipLocked') {
    throw new Error(
      `SQLite does not support ${lock.modifier.toUpperCase()} lock modifier. ` +
      `Use BEGIN IMMEDIATE/EXCLUSIVE transaction for database-level locking.`
    )
  }
  // forUpdate / sharedLock 靜默忽略：SQLite 的 BEGIN IMMEDIATE 已提供獨占語義
  return ''
}
```

### 5.5 其他 Grammar

- **MongoGrammar / NullGrammar**：不實作 `compileLock`，保持 `undefined`，`compileSelect` 會跳過

## 6. 非 Transaction Warning

```ts
// packages/atlas/src/query/QueryBuilder.ts

private warnIfLockOutsideTransaction(connection: ConnectionContract): void {
  if (!this.lockClause) return
  if (process.env.NODE_ENV === 'production') return

  const inTx = typeof connection.inTransaction === 'function'
    ? connection.inTransaction()
    : undefined

  if (inTx === false) {
    const apiName = this.lockClause.mode === 'share' ? 'sharedLock()' : 'forUpdate()'
    console.warn(
      `[atlas] ${apiName} called outside a transaction — the lock will be released ` +
      `immediately (autocommit mode). Wrap the query in DB.transaction() for the ` +
      `lock to be effective.`
    )
  }
}
```

**觸發時機**（所有讀取執行方法的最前面，取得 connection 後立即呼叫）：

- `get()`
- `first()` / `firstOrFail()`
- `find()` / `findOrFail()`
- `value()`
- `pluck()`
- `stream()`

**型別變更**：`ConnectionContract` 新增可選方法 `inTransaction?(): boolean`（各 driver 已有實作）。

## 7. 測試策略

### 7.1 單元測試

**`tests/query/lock.test.ts`**（QueryBuilder 層）

- API contract：4 個方法的正確鏈式 / 拋錯 / 覆蓋行為
- SQL generation（Postgres / MySQL / SQLite 各方言）
- Cache key：lock 狀態影響 structural key
- Non-transaction warning：dev 警告 / prod 沉默 / inTransaction undefined 時沉默

**`tests/grammar/lock.test.ts`**（Grammar 層）

- 直接測 `compileLock` 各種 mode × modifier 組合
- SQLite 錯誤訊息包含升級指引

### 7.2 整合測試

**`tests/integration/lock.integration.test.ts`**（需真實 Postgres）

- Tx A `forUpdate()` → Tx B 同列 `forUpdate()` 阻塞 → A commit → B 取得鎖
- Tx A `forUpdate()` → Tx B `forUpdate().skipLocked()` → B 立即回空
- Tx A `forUpdate()` → Tx B `forUpdate().noWait()` → B 拋 Postgres lock error

**覆蓋率目標**：單元測試 90%+，整合測試作為 E2E 煙霧測試。

## 8. 破壞性變更與遷移

### 8.1 MySQLGrammar.compileLock 輸出變更

- **舊**：`sharedLock` → `LOCK IN SHARE MODE`
- **新**：`sharedLock` → `FOR SHARE`

**實際影響**：目前沒有任何 QueryBuilder 呼叫 `compileLock`（Grammar.compileSelect 沒拼接它），等同於新功能，**無現有用戶受影響**。為安全起見仍標註為 breaking change。

### 8.2 版本策略

- Atlas 主版本號升 **minor**（無需 major bump）
- CHANGELOG 明確標註 breaking change

### 8.3 最低資料庫版本要求

- **MySQL**：8.0+（原 5.7 已 EOL）
- **PostgreSQL**：9.5+（SKIP LOCKED 自 9.5 開始支援）
- **SQLite**：3.x（forUpdate/sharedLock 靜默忽略）

## 9. 文件更新清單

1. `packages/atlas/README.md`（或 Atlas 對應文件）— 新增 "Pessimistic Locking" 章節：
   - API 範例（4 個方法）
   - MySQL 8.0+ 最低版本要求
   - SQLite 行為說明
   - 交易內使用警告
2. `CHANGELOG.md`：
   - `feat(atlas): add pessimistic locking API (forUpdate/sharedLock/noWait/skipLocked)`
   - `BREAKING(atlas): MySQL sharedLock now outputs FOR SHARE (MySQL 8.0+ required)`
3. JSDoc：每個 public method 附 `@example` 和交易要求說明

## 10. 實作範圍（YAGNI 檢查）

### 本次包含

- ✅ `forUpdate` / `sharedLock` / `noWait` / `skipLocked` 4 個方法
- ✅ Postgres / MySQL / SQLite Grammar 支援
- ✅ 非 transaction warning
- ✅ 完整單元 + 整合測試
- ✅ 文件、CHANGELOG、JSDoc

### 不包含（留待未來）

- ❌ `update()` / `delete()` 與 lock 組合
- ❌ MySQL 5.7 相容
- ❌ MongoDB lock（需另行設計）
- ❌ `lockForUpdate(duration)` 等帶時限變體
- ❌ Isolation level 建議 / 自動選擇

## 11. 時程估算

| 階段 | 內容 | 時間 |
|---|---|---|
| 1 | 型別擴充 | 20 分鐘 |
| 2 | QueryBuilder 實作 | 30 分鐘 |
| 3 | Grammar 層實作 | 40 分鐘 |
| 4 | 非 transaction warning | 30 分鐘 |
| 5 | 單元測試 | 1 小時 |
| 6 | 整合測試 | 1 小時 |
| 7 | 文件、CHANGELOG、JSDoc | 30 分鐘 |
| **合計** | | **~4.5 小時** |

### 實作順序（TDD）

1. 寫單元測試（RED）
2. 實作型別 → QueryBuilder → Grammar（GREEN）
3. 實作 warning + 對應測試
4. 寫整合測試
5. 文件 / CHANGELOG

## 12. 使用範例

```ts
// 基本用法
await DB.transaction(async () => {
  const user = await User.query()
    .where('id', userId)
    .forUpdate()
    .firstOrFail()

  await user.update({ balance: user.balance - amount })
})

// Queue 處理（SKIP LOCKED）
await DB.transaction(async () => {
  const jobs = await Job.query()
    .where('status', 'pending')
    .forUpdate()
    .skipLocked()
    .limit(10)
    .get()

  for (const job of jobs) {
    await processJob(job)
  }
})

// 非阻塞檢查（NOWAIT）
try {
  await DB.transaction(async () => {
    const lock = await Lock.query()
      .where('resource', resourceId)
      .forUpdate()
      .noWait()
      .first()
    // ...
  })
} catch (err) {
  if (err.code === '55P03') {
    // Postgres lock_not_available
    return { acquired: false }
  }
  throw err
}

// 共享鎖（讀取保護，允許其他 SHARE，阻擋 UPDATE）
await DB.transaction(async () => {
  const report = await Report.query()
    .where('id', reportId)
    .sharedLock()
    .firstOrFail()
  // 產生報表期間，其他連線可讀但不能改
})
```

---

**設計狀態**：已與用戶完成 6 段逐步確認（Section 1-6 皆 OK）。下一步：writing-plans 產出實作計畫。
