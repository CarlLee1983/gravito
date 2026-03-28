# Atlas HIGH-Severity Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all HIGH-severity issues found in the Atlas code quality review — addressing architectural flaws, resource leaks, dead code, and semantic incorrectness across QueryBuilder, ORM, drivers, and connection management.

**Architecture:** Fixes are ordered by dependency: QueryBuilder internals first (CoW, clauses, dead code), then ORM, then drivers, then connection layer. Each task is independent and produces a self-contained commit.

**Tech Stack:** TypeScript, Bun test runner, packages/atlas

---

## File Map

| File | Changes |
|------|---------|
| `packages/atlas/src/query/builders/PaginationBuilder.ts` | Fix `paginate()` to clone builder before applying limit/offset |
| `packages/atlas/src/query/clauses/WhereClause.ts` | Fix `clone()` to deep-copy nested conditions recursively |
| `packages/atlas/src/query/builders/SubqueryBuilder.ts` | Delete (dead code, never imported) |
| `packages/atlas/src/query/NPlusOneDetector.ts` | Add max entries cap + periodic eviction of stale entries |
| `packages/atlas/src/orm/Repository.ts` | Fix `update()` to use `fill()` instead of `Object.assign` |
| `packages/atlas/src/orm/model/Model.ts` | Replace `_studlyCache` full-clear with LRU eviction |
| `packages/atlas/src/drivers/RedisDriver.ts` | Throw `UnsupportedOperationError` for transaction methods |
| `packages/atlas/src/drivers/MongoDBDriver.ts` | Same — throw for transaction methods |
| `packages/atlas/src/drivers/BunSQLDriver.ts` | Only call `last_insert_rowid()` after INSERT, not SELECT |
| `packages/atlas/src/drivers/SQLiteDriver.ts` | Same fix |
| `packages/atlas/src/grammar/PostgresGrammar.ts` | Use a flag instead of string replace for RETURNING |
| `packages/atlas/src/connection/Connection.ts` | Remove constructor Proxy (redundant with ConnectionManager) |
| `packages/atlas/src/connection/ConnectionManager.ts` | Keep only the ConnectionManager Proxy |

---

## Task 1: Fix `PaginationBuilder.paginate()` State Mutation

**Files:**
- Modify: `packages/atlas/src/query/builders/PaginationBuilder.ts:44-67`
- Test: `packages/atlas/tests/QueryBuilder-extra.test.ts`

- [ ] **Step 1: Read the current paginate code**

Read `packages/atlas/src/query/builders/PaginationBuilder.ts` to understand the full class.

- [ ] **Step 2: Fix `paginate()` to clone before applying limit/offset**

The current code calls `this.queryBuilder.limit(perPage).offset(...)` directly, mutating the held reference. Fix by cloning:

```typescript
async paginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
  this.queryBuilder.ensureDeterministicOrder(primaryKey)

  const total = await this.queryBuilder.clone().count()

  const data = await this.queryBuilder
    .clone()
    .limit(perPage)
    .offset((page - 1) * perPage)
    .get()

  const totalPages = Math.ceil(total / perPage)

  return {
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
```

The key change: add `.clone()` before `.limit(perPage).offset(...)`.

- [ ] **Step 3: Also fix `chunk()` which delegates to `paginate()`**

`chunk()` calls `this.paginate(size, page)` in a loop. Since `paginate()` now clones, `chunk()` is automatically fixed. No changes needed to `chunk()` itself.

- [ ] **Step 4: Run tests**

Run: `cd packages/atlas && bun test tests/QueryBuilder.test.ts tests/QueryBuilder-extra.test.ts tests/CursorPagination.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/query/builders/PaginationBuilder.ts
git commit -m "fix: [atlas] PaginationBuilder.paginate() 改用 clone 避免修改原始 builder"
```

---

## Task 2: Fix `WhereClause.clone()` Shallow Nested Copy

**Files:**
- Modify: `packages/atlas/src/query/clauses/WhereClause.ts:396-407`
- Test: `packages/atlas/tests/WhereClause.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/WhereClause.test.ts`:

```typescript
test('clone() should deep-copy doubly-nested conditions', () => {
  const clause = new WhereClause()
  // Build nested condition: WHERE (a = 1 AND (b = 2))
  const innerCondition = { type: 'basic', column: 'b', operator: '=', value: 2, boolean: 'and' }
  const outerCondition = {
    type: 'nested',
    boolean: 'and',
    conditions: [
      { type: 'nested', boolean: 'and', conditions: [innerCondition] },
    ],
  }
  ;(clause as any).wheres = [outerCondition]

  const cloned = clause.clone()

  // Mutate inner conditions on the clone
  const clonedOuter = (cloned as any).wheres[0]
  clonedOuter.conditions[0].conditions.push({ type: 'basic', column: 'c', operator: '=', value: 3, boolean: 'and' })

  // Original should be unaffected
  const originalOuter = (clause as any).wheres[0]
  expect(originalOuter.conditions[0].conditions).toHaveLength(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/atlas && bun test tests/WhereClause.test.ts -t "deep-copy"`
Expected: FAIL — inner conditions array is shared.

- [ ] **Step 3: Fix clone() with recursive deep copy**

In `packages/atlas/src/query/clauses/WhereClause.ts`, replace the `clone()` method:

```typescript
clone(): WhereClause {
  const clone = new WhereClause()
  clone.wheres = this.deepCopyWheres(this.wheres)
  return clone
}

private deepCopyWheres(wheres: WhereClauseType[]): WhereClauseType[] {
  return wheres.map((w) => {
    if (w.type === 'nested' && w.conditions) {
      return { ...w, conditions: this.deepCopyWheres(w.conditions) }
    }
    return { ...w }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/WhereClause.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/query/clauses/WhereClause.ts packages/atlas/tests/WhereClause.test.ts
git commit -m "fix: [atlas] WhereClause.clone() 遞迴深拷貝巢狀條件"
```

---

## Task 3: Delete `SubqueryBuilder` Dead Code

**Files:**
- Delete: `packages/atlas/src/query/builders/SubqueryBuilder.ts`
- Modify: `packages/atlas/src/index.ts` (if exported)

- [ ] **Step 1: Verify SubqueryBuilder is never imported**

Run: `grep -r "SubqueryBuilder" packages/atlas/src/ --include="*.ts"` — should only show the file itself.

- [ ] **Step 2: Check index.ts exports**

Read `packages/atlas/src/index.ts` to see if `SubqueryBuilder` is exported. If so, remove the export.

- [ ] **Step 3: Delete the file**

```bash
rm packages/atlas/src/query/builders/SubqueryBuilder.ts
```

- [ ] **Step 4: Run typecheck and tests**

Run: `cd packages/atlas && bun run typecheck && bun test`

- [ ] **Step 5: Commit**

```bash
git add -A packages/atlas/src/query/builders/SubqueryBuilder.ts packages/atlas/src/index.ts
git commit -m "chore: [atlas] 刪除未使用的 SubqueryBuilder 死代碼"
```

---

## Task 4: Fix `NPlusOneDetector` Unbounded Memory Growth

**Files:**
- Modify: `packages/atlas/src/query/NPlusOneDetector.ts`
- Test: `packages/atlas/tests/NPlusOneDetection.test.ts`

- [ ] **Step 1: Fix with max entries cap and stale entry eviction**

Replace the entire file:

```typescript
export class NPlusOneDetector {
  private static queryCounts = new Map<string, { count: number; lastAt: number }>()
  private static timeframe = 1000
  private static threshold = 5
  private static enabled = process.env.NODE_ENV !== 'production'
  private static readonly MAX_ENTRIES = 500

  static track(tableName: string, sql: string, structureKey: string): void {
    if (!this.enabled) {
      return
    }

    const now = Date.now()
    const signature = `${tableName}:${structureKey}`

    const stats = this.queryCounts.get(signature)

    if (stats) {
      if (now - stats.lastAt > this.timeframe) {
        this.queryCounts.set(signature, { count: 1, lastAt: now })
      } else {
        this.queryCounts.set(signature, { count: stats.count + 1, lastAt: now })
      }
    } else {
      // Evict stale entries before adding new ones
      if (this.queryCounts.size >= this.MAX_ENTRIES) {
        this.evictStale(now)
      }
      this.queryCounts.set(signature, { count: 1, lastAt: now })
    }

    const current = this.queryCounts.get(signature)!
    if (current.count === this.threshold) {
      this.warn(tableName, sql, current.count)
    }
  }

  private static evictStale(now: number): void {
    for (const [key, stats] of this.queryCounts) {
      if (now - stats.lastAt > this.timeframe * 2) {
        this.queryCounts.delete(key)
      }
    }
    // If still too large after evicting stale, remove oldest entries
    if (this.queryCounts.size >= this.MAX_ENTRIES) {
      const entries = [...this.queryCounts.entries()]
        .sort((a, b) => a[1].lastAt - b[1].lastAt)
      const toRemove = entries.slice(0, Math.floor(this.MAX_ENTRIES / 4))
      for (const [key] of toRemove) {
        this.queryCounts.delete(key)
      }
    }
  }

  static reset(): void {
    this.queryCounts.clear()
  }

  static setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  private static warn(tableName: string, sql: string, count: number): void {
    const message =
      `\n[Atlas] \u26A0\uFE0F Potential N+1 Query Detected on table "${tableName}"\n` +
      `Executed ${count} similar queries within ${this.timeframe}ms.\n` +
      `Last Query: ${sql}\n` +
      `\uD83D\uDCA1 Suggestion: Use .with() to eager load relationships or .whereIn() for bulk retrieval.\n`

    console.warn(message)
  }
}
```

Key changes:
- Stats objects are replaced (immutable) instead of mutated in-place
- `MAX_ENTRIES = 500` cap prevents unbounded growth
- `evictStale()` removes entries older than `2 * timeframe`, then evicts oldest 25% if still full

- [ ] **Step 2: Run tests**

Run: `cd packages/atlas && bun test tests/NPlusOneDetection.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/atlas/src/query/NPlusOneDetector.ts
git commit -m "fix: [atlas] NPlusOneDetector 加入上限與過期清除防止記憶體洩漏"
```

---

## Task 5: Fix `Repository.update()` Bypassing Proxy

**Files:**
- Modify: `packages/atlas/src/orm/Repository.ts:204-208`
- Test: `packages/atlas/tests/ModelRepository.test.ts`

- [ ] **Step 1: Fix update() to use fill() instead of Object.assign**

In `packages/atlas/src/orm/Repository.ts`, replace lines 204-208:

```typescript
async update(id: unknown, attributes: Partial<T>): Promise<T> {
  const model = await this.findOrFail(id)
  model.fill(attributes as Record<string, unknown>)
  await model.save()
  return model
}
```

`fill()` goes through `setAttribute()` which triggers the Proxy set trap, mutators, and dirty tracking.

- [ ] **Step 2: Run tests**

Run: `cd packages/atlas && bun test tests/ModelRepository.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/atlas/src/orm/Repository.ts
git commit -m "fix: [atlas] Repository.update() 改用 fill() 取代 Object.assign 確保經過 Proxy"
```

---

## Task 6: Fix `_studlyCache` Performance Cliff

**Files:**
- Modify: `packages/atlas/src/orm/model/Model.ts:240-243`

- [ ] **Step 1: Replace full clear with oldest-25% eviction**

In `packages/atlas/src/orm/model/Model.ts`, replace lines 240-243:

```typescript
    // Prevent memory leaks by capping cache size
    if (Model._studlyCache.size > 5000) {
      // Evict oldest 25% instead of clearing everything
      const entries = [...Model._studlyCache.entries()]
      const toRemove = entries.slice(0, Math.floor(entries.length / 4))
      for (const [key] of toRemove) {
        Model._studlyCache.delete(key)
      }
    }
```

Note: `Map` preserves insertion order, so `entries.slice(0, n)` gets the oldest entries.

- [ ] **Step 2: Run tests**

Run: `cd packages/atlas && bun test tests/Model-extra.test.ts tests/ProxyModel.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/atlas/src/orm/model/Model.ts
git commit -m "fix: [atlas] _studlyCache 改為逐步淘汰取代全清避免性能懸崖"
```

---

## Task 7: Fix Redis/MongoDB Silent No-Op Transactions

**Files:**
- Modify: `packages/atlas/src/drivers/RedisDriver.ts:163-180`
- Modify: `packages/atlas/src/drivers/MongoDBDriver.ts:186-198`
- Test: `packages/atlas/tests/Drivers-extra.test.ts`

- [ ] **Step 1: Fix RedisDriver transaction methods**

In `packages/atlas/src/drivers/RedisDriver.ts`, replace lines 163-180:

```typescript
  async beginTransaction(): Promise<void> {
    throw new Error(
      'Redis does not support transactions via beginTransaction(). ' +
      'Use MULTI/EXEC directly via getRawClient().'
    )
  }

  async commit(): Promise<void> {
    throw new Error(
      'Redis does not support transactions via commit(). ' +
      'Use MULTI/EXEC directly via getRawClient().'
    )
  }

  async rollback(): Promise<void> {
    throw new Error(
      'Redis does not support transactions via rollback(). ' +
      'Use MULTI/EXEC directly via getRawClient().'
    )
  }

  inTransaction(): boolean {
    return false
  }
```

- [ ] **Step 2: Fix MongoDBDriver transaction methods**

In `packages/atlas/src/drivers/MongoDBDriver.ts`, replace lines 186-198:

```typescript
  async beginTransaction(): Promise<void> {
    throw new Error(
      'MongoDB transactions require a replica set. ' +
      'Use the native MongoDB client via getRawClient() for replica set transactions.'
    )
  }

  async commit(): Promise<void> {
    throw new Error(
      'MongoDB transactions require a replica set. ' +
      'Use the native MongoDB client via getRawClient() for replica set transactions.'
    )
  }

  async rollback(): Promise<void> {
    throw new Error(
      'MongoDB transactions require a replica set. ' +
      'Use the native MongoDB client via getRawClient() for replica set transactions.'
    )
  }

  inTransaction(): boolean {
    return false
  }
```

- [ ] **Step 3: Update tests that call these methods expecting no error**

Read `packages/atlas/tests/Drivers-extra.test.ts` and `packages/atlas/tests/RedisDriver.integration.test.ts` and `packages/atlas/tests/MongoDBDriver.integration.test.ts`. If any tests call `beginTransaction()`/`commit()`/`rollback()` on these drivers and expect success, update them to expect the thrown error.

- [ ] **Step 4: Run tests**

Run: `cd packages/atlas && bun test tests/Drivers-extra.test.ts tests/RedisDriver.integration.test.ts tests/MongoDBDriver.integration.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/drivers/RedisDriver.ts packages/atlas/src/drivers/MongoDBDriver.ts packages/atlas/tests/
git commit -m "fix: [atlas] Redis/MongoDB 交易方法改為拋出錯誤取代靜默空操作"
```

---

## Task 8: Fix BunSQLDriver/SQLiteDriver Extra `last_insert_rowid()` on SELECT

**Files:**
- Modify: `packages/atlas/src/drivers/BunSQLDriver.ts:129-136`
- Modify: `packages/atlas/src/drivers/SQLiteDriver.ts:247-253`

- [ ] **Step 1: Fix BunSQLDriver — only call last_insert_rowid after INSERT**

In `packages/atlas/src/drivers/BunSQLDriver.ts`, wrap the `last_insert_rowid()` call in a check:

```typescript
      let lastInsertRowid: any
      if (sql.trimStart().toUpperCase().startsWith('INSERT')) {
        try {
          // @ts-expect-error
          const idRes = this.sqliteClient.query('SELECT last_insert_rowid() as id').get() as any
          lastInsertRowid = idRes?.id
        } catch {
          /* ignore */
        }
      }
```

- [ ] **Step 2: Fix SQLiteDriver — same pattern**

In `packages/atlas/src/drivers/SQLiteDriver.ts`, wrap similarly:

```typescript
      let lastInsertId: any
      if (sql.trimStart().toUpperCase().startsWith('INSERT')) {
        try {
          const idRes = this.client.prepare('SELECT last_insert_rowid() as id').get() as any
          lastInsertId = idRes?.id
        } catch {
          /* ignore */
        }
      }
```

- [ ] **Step 3: Run tests**

Run: `cd packages/atlas && bun test tests/BunSQLDriver.test.ts tests/SQLiteDriver-batch.test.ts tests/SQLiteDriver-cache.test.ts`

- [ ] **Step 4: Commit**

```bash
git add packages/atlas/src/drivers/BunSQLDriver.ts packages/atlas/src/drivers/SQLiteDriver.ts
git commit -m "fix: [atlas] SQLite 驅動只在 INSERT 後呼叫 last_insert_rowid() 減少多餘查詢"
```

---

## Task 9: Fix PostgresGrammar Fragile RETURNING Strip

**Files:**
- Modify: `packages/atlas/src/grammar/PostgresGrammar.ts:42-46,66-72`
- Test: `packages/atlas/tests/PostgresGrammar.test.ts`

- [ ] **Step 1: Fix compileInsert to use a separate base call**

The problem: `compileUpsert` calls `super.compileInsert()` which goes to the base Grammar, then strips `RETURNING *` with `.replace()`. Instead, extract a method:

In `packages/atlas/src/grammar/PostgresGrammar.ts`:

```typescript
  /**
   * Compile base INSERT without RETURNING (for reuse in compileUpsert)
   */
  private compileBaseInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    return super.compileInsert(query, values)
  }

  /**
   * Compile INSERT with RETURNING clause for PostgreSQL
   */
  override compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    return `${this.compileBaseInsert(query, values)} RETURNING *`
  }
```

Then in `compileUpsert`, replace the fragile `.replace()`:

```typescript
  override compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string {
    const insertSql = this.compileBaseInsert(query, values)
    // ... rest of method unchanged, but uses insertSql (no RETURNING)
```

- [ ] **Step 2: Also remove dead compileUpdate override**

The `compileUpdate` override (lines 51-54) just calls `super.compileUpdate` and returns unchanged. Delete it — it's dead code:

```typescript
  // DELETE these lines entirely:
  // override compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string {
  //   const baseSql = super.compileUpdate(query, values)
  //   return baseSql
  // }
```

- [ ] **Step 3: Run tests**

Run: `cd packages/atlas && bun test tests/PostgresGrammar.test.ts tests/Grammar-extra.integration.test.ts`

- [ ] **Step 4: Commit**

```bash
git add packages/atlas/src/grammar/PostgresGrammar.ts
git commit -m "fix: [atlas] PostgresGrammar 用 compileBaseInsert 取代脆弱的字串替換"
```

---

## Task 10: Remove Connection Double Proxy

**Files:**
- Modify: `packages/atlas/src/connection/Connection.ts:68-88`
- Modify: `packages/atlas/src/connection/ConnectionManager.ts:173-193`
- Test: `packages/atlas/tests/Connection-extra.test.ts`

- [ ] **Step 1: Read Connection.ts and ConnectionManager.ts**

Understand: `Connection` constructor wraps `this` in a Proxy. Then `ConnectionManager._buildConnection()` wraps the result in ANOTHER Proxy with the exact same logic. The inner Proxy is redundant.

- [ ] **Step 2: Remove the Proxy from Connection constructor**

In `packages/atlas/src/connection/Connection.ts`, remove lines 68-88 (the Proxy return). The constructor should just set fields and return `this` normally:

```typescript
  constructor(name: string, config: ConnectionConfig) {
    this.name = name
    this.config = config
    this.driver = this.createDriver(config)
    this.grammar = this.createGrammar(config)
    this.tracer = (config as BaseConnectionConfig).tracer
    this.metrics = (config as BaseConnectionConfig).metrics
  }
```

Remove the `biome-ignore lint/correctness/noConstructorReturn` comment since it's no longer needed.

- [ ] **Step 3: Keep the ConnectionManager Proxy** (it already does the same thing)

Verify `ConnectionManager._buildConnection()` still wraps with Proxy. This is the single place where the Proxy is applied. No changes needed here.

- [ ] **Step 4: Run tests**

Run: `cd packages/atlas && bun test tests/Connection-extra.test.ts tests/ConnectionFactory.test.ts tests/ReadWriteReplicas.test.ts tests/DB.test.ts tests/DB-extra.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/connection/Connection.ts
git commit -m "fix: [atlas] 移除 Connection 建構子冗餘 Proxy，保留 ConnectionManager 單一 Proxy"
```

---

## Final Validation

- [ ] **Run full Atlas test suite**

```bash
cd packages/atlas && bun test
```

- [ ] **Run typecheck**

```bash
cd packages/atlas && bun run typecheck
```
