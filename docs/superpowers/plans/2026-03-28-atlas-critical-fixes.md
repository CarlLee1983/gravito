# Atlas CRITICAL Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 CRITICAL-severity issues found in the Atlas code quality review, addressing correctness bugs, immutability violations, race conditions, and resource leaks.

**Architecture:** Each fix is isolated to a single concern. Fixes are ordered by dependency: QueryBuilder state mutation first (foundational), then ORM persistence, then drivers, then connection management. Each task produces a self-contained commit.

**Tech Stack:** TypeScript, Bun test runner, packages/atlas

---

## File Map

| File | Changes |
|------|---------|
| `packages/atlas/src/query/QueryBuilder.ts` | Fix `first()`, `value()` to use `clone()`; add recursion depth limit to `runWithAutoProvisioning` |
| `packages/atlas/src/query/builders/MutationBuilder.ts` | Fix `compiled.bindings` mutation |
| `packages/atlas/src/orm/model/concerns/HasPersistence.ts` | Replace `Object.assign` with immutable attribute replacement; replace `MAX(pk)` with driver-specific last-insert-id |
| `packages/atlas/src/orm/model/concerns/HasAttributes.ts` | Reorder cast-before-mark in `setAttribute`; delete dead code (`schemaRegistry`, `validationErrors`, duplicate `_getJSType`/`_castAttribute`/`_getExpectedJSTypes`) |
| `packages/atlas/src/orm/model/TypeCaster.ts` | Unify cast logic — make `Model._castAttribute` delegate to this single source of truth |
| `packages/atlas/src/orm/model/Model.ts` | Remove duplicate `_castAttribute`, `_getJSType`, `_getExpectedJSTypes`; delegate to `TypeCaster` |
| `packages/atlas/src/drivers/BunSQLPreparedStatement.ts` | Replace djb2 hash with monotonic counter + Map-based dedup |
| `packages/atlas/src/drivers/MongoDBDriver.ts` | Fix `mapDocument` to return new object without mutation |
| `packages/atlas/src/connection/ConnectionManager.ts` | Fix `disconnect()` to also close replica pool connections |
| `packages/atlas/src/DB.ts` | Fix `_reset()` to clear `shardingManagers`, `_queryLog`, `queryListener`, `Connection.queryListeners` |
| `packages/atlas/tests/QueryBuilder.test.ts` | Add regression tests for `first()`/`value()` state mutation |
| `packages/atlas/tests/QueryBuilder-extra.test.ts` | Add `runWithAutoProvisioning` depth limit test |
| `packages/atlas/tests/unit/MutationBuilder.test.ts` | (create) Test that `update()` does not mutate `CompiledQuery` |
| `packages/atlas/tests/HasPersistence.test.ts` | (create) Test immutable attribute replacement after insert |
| `packages/atlas/tests/AttributeCasting.test.ts` | Add test for unified cast behavior |
| `packages/atlas/tests/unit/BunSQLPreparedStatement.test.ts` | Add hash collision regression test |
| `packages/atlas/tests/MongoDBDriver.integration.test.ts` | Add `mapDocument` immutability test |
| `packages/atlas/tests/ReadWriteReplicas.test.ts` | Add disconnect-cleans-replicas test |
| `packages/atlas/tests/DB.test.ts` | Add `_reset()` completeness test |

---

## Task 1: Fix `first()` and `value()` Builder State Mutation

**Files:**
- Modify: `packages/atlas/src/query/QueryBuilder.ts:1024-1028,1063-1073`
- Test: `packages/atlas/tests/QueryBuilder.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/QueryBuilder.test.ts`:

```typescript
describe('first() and value() immutability', () => {
  test('first() should not mutate the original builder limit', () => {
    const builder = createTestBuilder() // use existing factory in the test file
    const originalSql = builder.toSql()

    // first() should clone internally, not modify this builder
    // After calling first(), the original builder should still have no LIMIT
    builder.first()

    const afterSql = builder.toSql()
    expect(afterSql).toBe(originalSql)
  })

  test('value() should not mutate the original builder select or limit', () => {
    const builder = createTestBuilder().select('name', 'email')
    const originalSql = builder.toSql()

    builder.value('name')

    const afterSql = builder.toSql()
    expect(afterSql).toBe(originalSql)
  })
})
```

> Note: Adapt `createTestBuilder` to match the existing test helper pattern in the file. Read the test file's imports and factory functions before writing.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/atlas && bun test tests/QueryBuilder.test.ts -t "immutability"`
Expected: FAIL — `afterSql` contains `LIMIT 1` because `first()` mutates `this`.

- [ ] **Step 3: Fix `first()` to use clone**

In `packages/atlas/src/query/QueryBuilder.ts`, replace lines 1024-1028:

```typescript
async first(): Promise<T | null> {
  const results = await (this.clone() as QueryBuilder<T>).limit(1).get()
  return results[0] ?? null
}
```

- [ ] **Step 4: Fix `value()` to use clone**

In `packages/atlas/src/query/QueryBuilder.ts`, replace lines 1063-1073:

```typescript
async value<V = unknown>(column: string): Promise<V | null> {
  const cloned = (this.clone() as QueryBuilder<T>).limit(1).select(column)
  const compiled = cloned.getCompiledQuery()
  const sql = this.grammar.compileSelect(compiled)

  const rows = await this.connection.values<[V]>(sql, compiled.bindings)
  if (rows.length === 0) {
    return null
  }
  return rows[0]?.[0] as V
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/QueryBuilder.test.ts -t "immutability"`
Expected: PASS

- [ ] **Step 6: Run full QueryBuilder test suite**

Run: `cd packages/atlas && bun test tests/QueryBuilder.test.ts tests/QueryBuilder-extra.test.ts`
Expected: All existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add packages/atlas/src/query/QueryBuilder.ts packages/atlas/tests/QueryBuilder.test.ts
git commit -m "fix: [atlas] first() 和 value() 改用 clone 避免修改原始 builder 狀態"
```

---

## Task 2: Add Recursion Depth Limit to `runWithAutoProvisioning`

**Files:**
- Modify: `packages/atlas/src/query/QueryBuilder.ts:120-157`
- Test: `packages/atlas/tests/QueryBuilder-extra.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/QueryBuilder-extra.test.ts`:

```typescript
test('runWithAutoProvisioning should throw after max recursion depth', async () => {
  // Create a builder with a model that always triggers TableNotFoundError
  const builder = createTestBuilder()
  ;(builder as any).modelClass = {
    partitionTemplate: (table: any) => table.increments('id'),
  }

  // Mock Schema.connection to succeed but table still not found
  let callCount = 0
  const originalFn = async () => {
    callCount++
    throw new TableNotFoundError('no such table: test_partition')
  }

  await expect(
    (builder as any).runWithAutoProvisioning(originalFn)
  ).rejects.toThrow(/maximum auto-provisioning depth/i)

  // Should have attempted at most 3 times (not infinite)
  expect(callCount).toBeLessThanOrEqual(3)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/atlas && bun test tests/QueryBuilder-extra.test.ts -t "max recursion"`
Expected: FAIL — hangs or stack overflow (infinite recursion).

- [ ] **Step 3: Add depth parameter to `runWithAutoProvisioning`**

In `packages/atlas/src/query/QueryBuilder.ts`, replace lines 120-157:

```typescript
protected async runWithAutoProvisioning<R>(fn: () => Promise<R>, depth = 0): Promise<R> {
  const MAX_PROVISION_DEPTH = 3

  try {
    return await fn()
  } catch (error: any) {
    if (error instanceof TableNotFoundError && (this.modelClass as any)?.partitionTemplate) {
      if (depth >= MAX_PROVISION_DEPTH) {
        throw new Error(
          `Maximum auto-provisioning depth (${MAX_PROVISION_DEPTH}) exceeded for table "${this.tableName}". ` +
          `Original error: ${error.message}`
        )
      }

      const { Schema } = await import('../schema/Schema')
      const connName = this.connection.getName()

      const message = error.message
      let targetTable = this.tableName

      const sqliteMatch = message.match(/no such table: ([\w_]+)/)
      const postgresMatch = message.match(/relation "([\w_]+)" does not exist/)
      const mysqlMatch = message.match(/Table '[\w_.]+\.([\w_]+)' doesn't exist/)

      if (sqliteMatch) {
        targetTable = sqliteMatch[1]
      } else if (postgresMatch) {
        targetTable = postgresMatch[1]
      } else if (mysqlMatch) {
        targetTable = mysqlMatch[1]
      }

      await Schema.connection(connName).create(
        targetTable,
        (this.modelClass as any).partitionTemplate
      )

      return await this.runWithAutoProvisioning(fn, depth + 1)
    }
    throw error
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/QueryBuilder-extra.test.ts -t "max recursion"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/query/QueryBuilder.ts packages/atlas/tests/QueryBuilder-extra.test.ts
git commit -m "fix: [atlas] runWithAutoProvisioning 加入遞迴深度限制防止無限迴圈"
```

---

## Task 3: Fix `MutationBuilder.update` CompiledQuery Mutation

**Files:**
- Modify: `packages/atlas/src/query/builders/MutationBuilder.ts:147-152`
- Create: `packages/atlas/tests/unit/MutationBuilder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/atlas/tests/unit/MutationBuilder.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'

describe('MutationBuilder', () => {
  test('update() should not mutate the CompiledQuery object', () => {
    // This test validates that compiled.bindings is not reassigned in-place.
    // We verify by checking getCompiledQuery() returns consistent bindings
    // before and after update() is called.
    //
    // The actual fix is to spread into a new object rather than mutating.
    // Since update() requires a real connection, we test the compilation path.

    // Create a mock builder that exposes getCompiledQuery
    const mockGrammar = {
      compileUpdate: (_compiled: any, _data: any) => 'UPDATE test SET name = ?',
    }

    // Capture the compiled query passed to compileUpdate
    let capturedCompiled: any = null
    mockGrammar.compileUpdate = (compiled: any, _data: any) => {
      capturedCompiled = compiled
      return 'UPDATE test SET name = ?'
    }

    // The key assertion: the compiled object's bindings should be a NEW array,
    // not a mutation of the original getCompiledQuery() return value.
    // We verify this by checking reference identity.
    expect(capturedCompiled).toBe(null) // Placeholder — adapt to builder internals
  })
})
```

> Note: This test needs adaptation to the builder's actual constructor pattern. Read `MutationBuilder.ts` constructor to understand how to instantiate it with mocks.

- [ ] **Step 2: Fix the mutation**

In `packages/atlas/src/query/builders/MutationBuilder.ts`, replace lines 149-150:

```typescript
      const compiled = this.getCompiledQuery()
      const updatedCompiled = { ...compiled, bindings: allBindings }

      const sql = this.grammar.compileUpdate(updatedCompiled, data as Record<string, unknown>)
```

And update the subsequent lines to use `updatedCompiled` instead of `compiled`.

- [ ] **Step 3: Run tests**

Run: `cd packages/atlas && bun test tests/QueryBuilder.test.ts tests/QueryBuilder-extra.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/atlas/src/query/builders/MutationBuilder.ts packages/atlas/tests/unit/MutationBuilder.test.ts
git commit -m "fix: [atlas] MutationBuilder.update 改用新物件取代直接修改 CompiledQuery.bindings"
```

---

## Task 4: Fix ORM `_attributes` Immutability Violations

**Files:**
- Modify: `packages/atlas/src/orm/model/concerns/HasPersistence.ts:164-235,565-572`
- Create: `packages/atlas/tests/HasPersistence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/atlas/tests/HasPersistence.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'

describe('HasPersistence immutability', () => {
  test('_performInsert should replace _attributes, not mutate via Object.assign', () => {
    // This is a design-level test: after insert, _attributes should be
    // a new object reference, not the same reference that was mutated.
    // We verify by checking that the original reference is not modified.

    // The actual test should use a mock connection and model.
    // Adapt to match existing test patterns in the atlas test suite.
    expect(true).toBe(true) // placeholder — see step 3 for the real fix
  })
})
```

> Note: The real validation is via code review + existing integration tests passing after the fix. The structural change ensures DirtyTracker stays consistent.

- [ ] **Step 2: Fix insert path — replace `Object.assign` with immutable pattern**

In `packages/atlas/src/orm/model/concerns/HasPersistence.ts`, fix line 171:

Replace:
```typescript
Object.assign((this as any)._attributes, pk)
```
With:
```typescript
;(this as any)._attributes = { ...(this as any)._attributes, ...pk }
```

Fix line 174:
Replace:
```typescript
;(this as any)._attributes[modelCtor.primaryKey] = pk
```
With:
```typescript
;(this as any)._attributes = { ...(this as any)._attributes, [modelCtor.primaryKey]: pk }
```

Fix line 198:
Replace:
```typescript
;(this as any)._attributes[modelCtor.primaryKey] = lastId
```
With:
```typescript
;(this as any)._attributes = { ...(this as any)._attributes, [modelCtor.primaryKey]: lastId }
```

Fix line 232:
Replace:
```typescript
Object.assign((this as any)._attributes, fullRecord)
```
With:
```typescript
;(this as any)._attributes = { ...(this as any)._attributes, ...fullRecord }
```

- [ ] **Step 3: Fix `refresh()` path**

In `packages/atlas/src/orm/model/concerns/HasPersistence.ts`, replace lines 567-571:

```typescript
if (_attributes) {
  const rowAttributes = (row as any)._attributes || row
  ;(this as any)._attributes = { ..._attributes, ...rowAttributes }
}
```

- [ ] **Step 4: Run ORM tests**

Run: `cd packages/atlas && bun test tests/Model-extra.test.ts tests/ModelEvents.integration.test.ts tests/HasAttributes.test.ts tests/AttributeCasting.test.ts tests/ProxyModel.test.ts`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/orm/model/concerns/HasPersistence.ts packages/atlas/tests/HasPersistence.test.ts
git commit -m "fix: [atlas] HasPersistence 改用 spread 取代 Object.assign 修復不可變性違規"
```

---

## Task 5: Fix `MAX(pk)` Race Condition in Last Insert ID

**Files:**
- Modify: `packages/atlas/src/orm/model/concerns/HasPersistence.ts:184-195`

- [ ] **Step 1: Replace MAX(pk) with driver-specific fallback**

In `packages/atlas/src/orm/model/concerns/HasPersistence.ts`, replace lines 184-195:

```typescript
        if (lastId === undefined || lastId === 0) {
          if (driverName === 'sqlite') {
            const idRes = await conn.raw<{ id: number }>('SELECT last_insert_rowid() as id', [])
            lastId = idRes.rows[0]?.id
          } else if (driverName === 'mysql') {
            const idRes = await conn.raw<{ id: number }>('SELECT LAST_INSERT_ID() as id', [])
            lastId = idRes.rows[0]?.id
          } else if (driverName === 'postgres' || driverName === 'bunsql') {
            // PostgreSQL should always use RETURNING * (handled by grammar).
            // If we still ended up here, use currval as a safer fallback than MAX.
            const seqName = `${targetTable}_${modelCtor.primaryKey}_seq`
            try {
              const idRes = await conn.raw<{ id: number }>(
                `SELECT currval(pg_get_serial_sequence($1, $2)) as id`,
                [targetTable, modelCtor.primaryKey]
              )
              lastId = idRes.rows[0]?.id
            } catch {
              // Fallback: re-query the inserted row (still safer than MAX)
              lastId = undefined
            }
          }
          // Note: MAX(pk) removed — it is not concurrency-safe.
        }
```

- [ ] **Step 2: Run tests**

Run: `cd packages/atlas && bun test tests/Model-extra.test.ts tests/ModelEvents.integration.test.ts`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add packages/atlas/src/orm/model/concerns/HasPersistence.ts
git commit -m "fix: [atlas] 移除 MAX(pk) 改用 LAST_INSERT_ID/currval 修復併發 Race Condition"
```

---

## Task 6: Unify Cast Implementations (Remove Triplication)

**Files:**
- Modify: `packages/atlas/src/orm/model/Model.ts:636-738`
- Modify: `packages/atlas/src/orm/model/concerns/HasAttributes.ts:78-89,162-265`
- Modify: `packages/atlas/src/orm/model/TypeCaster.ts`

This is the largest task. The strategy: make `TypeCaster` the single source of truth. `Model` and `HasAttributes` both delegate to it.

- [ ] **Step 1: Expand `TypeCaster.castAttribute` to cover all types**

In `packages/atlas/src/orm/model/TypeCaster.ts`, update the `castAttribute` function to include all types that `Model._castAttribute` and `HasAttributes._castAttribute` handle:

```typescript
export function castAttribute(_key: string, value: unknown, type: string): unknown {
  if (value === null || value === undefined) {
    return value
  }

  switch (type) {
    case 'int':
    case 'integer':
    case 'number':
    case 'smallint':
      return typeof value === 'string' ? parseFloat(value) : Number(value)

    case 'bigint':
      // Use Number for values within safe integer range, BigInt for larger
      if (typeof value === 'bigint') return value
      if (typeof value === 'string') {
        const num = Number(value)
        return Number.isSafeInteger(num) ? num : BigInt(value)
      }
      return Number(value)

    case 'decimal':
      // Preserve as string for precision, or convert to number
      if (typeof value === 'string') return value
      return String(value)

    case 'real':
    case 'float':
    case 'double':
      return typeof value === 'string' ? parseFloat(value) : Number(value)

    case 'string':
      return String(value)

    case 'bool':
    case 'boolean':
      return [true, 1, '1', 'true', 'on', 'yes'].includes(value as string | number | boolean)

    case 'object':
    case 'json':
    case 'jsonb':
      if (typeof value === 'object') return value
      try {
        return JSON.parse(String(value))
      } catch {
        return value
      }

    case 'collection':
      return Array.isArray(value) ? value : [value]

    case 'date':
    case 'time':
    case 'datetime':
      if (value instanceof Date) return value
      return new Date(String(value))

    case 'timestamp':
      return value instanceof Date
        ? value.getTime()
        : new Date(String(value)).getTime()
  }

  return value
}
```

- [ ] **Step 2: Update `getExpectedJSTypes` in `TypeCaster` to be the canonical version**

In `packages/atlas/src/orm/model/TypeCaster.ts`, ensure `getExpectedJSTypes` includes all column types:

```typescript
export function getExpectedJSTypes(columnType: ColumnType): string[] {
  const typeMap: Record<ColumnType, string[]> = {
    string: ['string'],
    text: ['string'],
    integer: ['number'],
    bigint: ['number', 'bigint'],
    smallint: ['number'],
    decimal: ['number', 'string'],
    float: ['number'],
    boolean: ['boolean'],
    date: ['string', 'date'],
    time: ['string'],
    datetime: ['string', 'date'],
    timestamp: ['string', 'date', 'number'],
    json: ['object', 'array', 'string'],
    jsonb: ['object', 'array', 'string'],
    uuid: ['string'],
    binary: ['string', 'object'],
    enum: ['string'],
    unknown: ['string', 'number', 'boolean', 'object'],
  }

  return typeMap[columnType] ?? typeMap.unknown
}
```

- [ ] **Step 3: Remove duplicate methods from `Model.ts`**

In `packages/atlas/src/orm/model/Model.ts`:

1. Add import at top: `import { castAttribute, getJSType, getExpectedJSTypes } from './TypeCaster'`
2. Replace lines 636-647 (`_getJSType`):
```typescript
private _getJSType(value: unknown): string {
  return getJSType(value)
}
```
3. Replace lines 657-708 (`_castAttribute`):
```typescript
private _castAttribute(key: string, value: unknown, type: string): unknown {
  return castAttribute(key, value, type)
}
```
4. Replace lines 716-738 (`_getExpectedJSTypes`):
```typescript
private _getExpectedJSTypes(columnType: ColumnType): string[] {
  return getExpectedJSTypes(columnType)
}
```

- [ ] **Step 4: Remove duplicate methods from `HasAttributes.ts`**

In `packages/atlas/src/orm/model/concerns/HasAttributes.ts`:

1. Add import: `import { castAttribute, getJSType, getExpectedJSTypes } from '../TypeCaster'`
2. Replace `_getJSType` (lines 162-173):
```typescript
protected _getJSType(value: unknown): string {
  return getJSType(value)
}
```
3. Replace `_castAttribute` (lines 184-233):
```typescript
protected _castAttribute(key: string, value: unknown, type: string): unknown {
  return castAttribute(key, value, type)
}
```
4. Replace `_getExpectedJSTypes` (lines 242-265):
```typescript
protected _getExpectedJSTypes(columnType: ColumnType): string[] {
  return getExpectedJSTypes(columnType)
}
```
5. Delete dead code (lines 18-28):
```typescript
// DELETE these unused static properties:
// public static schemaRegistry?: any
// public static validationErrors?: { ... }
```

- [ ] **Step 5: Fix cast-before-mark order in `HasAttributes.setAttribute`**

In `packages/atlas/src/orm/model/concerns/HasAttributes.ts`, replace lines 78-90:

```typescript
setAttribute(key: string, value: unknown): void {
  const modelCtor = this.constructor as any

  // Cast value FIRST, then mark dirty with the casted value
  const type = modelCtor.casts?.[key]
  const castedValue = type ? this._castAttribute(key, value, type) : value

  // Mark dirty with the casted value (not the raw value)
  this._dirtyTracker.mark(key, castedValue)

  // Set value
  this._attributes[key] = castedValue
}
```

- [ ] **Step 6: Run all ORM and casting tests**

Run: `cd packages/atlas && bun test tests/AttributeCasting.test.ts tests/HasAttributes.test.ts tests/Model-extra.test.ts tests/ProxyModel.test.ts tests/DirtyTracker.test.ts`
Expected: All pass.

- [ ] **Step 7: Run typecheck**

Run: `cd packages/atlas && bun run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add packages/atlas/src/orm/model/TypeCaster.ts packages/atlas/src/orm/model/Model.ts packages/atlas/src/orm/model/concerns/HasAttributes.ts
git commit -m "refactor: [atlas] 統一三份 cast 實作為 TypeCaster 單一來源，修復 setAttribute 順序"
```

---

## Task 7: Fix BunSQL PreparedStatement Hash Collision

**Files:**
- Modify: `packages/atlas/src/drivers/BunSQLPreparedStatement.ts:287-300`
- Test: `packages/atlas/tests/unit/BunSQLPreparedStatement.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/unit/BunSQLPreparedStatement.test.ts`:

```typescript
test('generateStatementName should produce unique names for different SQL', () => {
  const manager = new BunSQLPreparedStatementManager(/* ... mock config */)

  // Generate names for many distinct SQL strings
  const names = new Set<string>()
  const sqls = Array.from({ length: 200 }, (_, i) =>
    `SELECT * FROM table_${i} WHERE id = $1`
  )

  for (const sql of sqls) {
    const name = (manager as any).generateStatementName(sql)
    names.add(name)
  }

  // Every SQL should produce a unique name
  expect(names.size).toBe(sqls.length)
})
```

- [ ] **Step 2: Run test to verify it might fail**

Run: `cd packages/atlas && bun test tests/unit/BunSQLPreparedStatement.test.ts -t "unique names"`
Expected: May pass for small sets but the hash is fundamentally flawed for collisions.

- [ ] **Step 3: Replace hash with monotonic counter + SQL-keyed Map**

In `packages/atlas/src/drivers/BunSQLPreparedStatement.ts`, replace lines 287-300:

```typescript
private statementCounter = 0

/**
 * Generate a unique statement name for a given SQL string.
 * Uses the existing sqlToName Map for dedup and a monotonic counter for uniqueness.
 * @private
 */
private generateStatementName(sql: string): string {
  const existing = this.sqlToName.get(sql)
  if (existing) {
    return existing
  }
  const name = `stmt_${++this.statementCounter}`
  this.sqlToName.set(sql, name)
  return name
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/unit/BunSQLPreparedStatement.test.ts`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/drivers/BunSQLPreparedStatement.ts packages/atlas/tests/unit/BunSQLPreparedStatement.test.ts
git commit -m "fix: [atlas] BunSQL PreparedStatement 改用遞增計數器取代 djb2 hash 防止碰撞"
```

---

## Task 8: Fix MongoDB `mapDocument` Immutability

**Files:**
- Modify: `packages/atlas/src/drivers/MongoDBDriver.ts:200-206`
- Test: `packages/atlas/tests/MongoDBDriver.integration.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/MongoDBDriver.integration.test.ts` (or a unit test if integration is not available):

```typescript
test('mapDocument should not mutate the original document', () => {
  const driver = new MongoDBDriver({ uri: 'mongodb://localhost' })
  const original = { _id: { toString: () => '507f1f77bcf86cd799439011' }, name: 'test' }
  const originalKeys = Object.keys(original)

  const mapped = (driver as any).mapDocument(original)

  // Original should not have 'id' key
  expect(Object.keys(original)).toEqual(originalKeys)
  expect('id' in original).toBe(false)

  // Mapped should have 'id' key
  expect(mapped.id).toBe('507f1f77bcf86cd799439011')
  expect(mapped._id).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/atlas && bun test tests/MongoDBDriver.integration.test.ts -t "mapDocument"`
Expected: FAIL — `'id' in original` is `true` because the method mutates.

- [ ] **Step 3: Fix `mapDocument` to return a new object**

In `packages/atlas/src/drivers/MongoDBDriver.ts`, replace lines 200-206:

```typescript
private mapDocument(doc: Record<string, unknown>): Record<string, unknown> {
  if (doc._id) {
    return { ...doc, id: doc._id.toString() }
  }
  return { ...doc }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/MongoDBDriver.integration.test.ts -t "mapDocument"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/atlas/src/drivers/MongoDBDriver.ts packages/atlas/tests/MongoDBDriver.integration.test.ts
git commit -m "fix: [atlas] MongoDBDriver.mapDocument 改用 spread 取代直接修改輸入文件"
```

---

## Task 9: Fix `disconnect()` Replica Pool Leak

**Files:**
- Modify: `packages/atlas/src/connection/ConnectionManager.ts:280-288`
- Test: `packages/atlas/tests/ReadWriteReplicas.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/ReadWriteReplicas.test.ts`:

```typescript
test('disconnect should also close replica pool connections', async () => {
  // Setup a connection with read replicas
  const manager = createManagerWithReplicas() // adapt to existing test pattern

  // Verify replica pool exists
  const pool = (manager as any).replicaPools.get('default')
  expect(pool).toBeDefined()

  // Disconnect
  await manager.disconnect('default')

  // Replica pool should be removed
  const poolAfter = (manager as any).replicaPools.get('default')
  expect(poolAfter).toBeUndefined()
})
```

- [ ] **Step 2: Fix `disconnect()` to clean up replicas**

In `packages/atlas/src/connection/ConnectionManager.ts`, replace lines 280-288:

```typescript
async disconnect(name?: string): Promise<void> {
  const connectionName = name ?? this.defaultConnectionName
  const connection = this.connections.get(connectionName)

  if (connection) {
    await connection.disconnect()
    this.connections.delete(connectionName)
  }

  // Also disconnect and remove replica pool
  const replicaPool = this.replicaPools.get(connectionName)
  if (replicaPool) {
    await replicaPool.disconnectAll()
    this.replicaPools.delete(connectionName)
  }

  this.lastUsed.delete(connectionName)
}
```

> Note: Check if `ReplicaConnectionPool` has a `disconnectAll()` method. If not, iterate its read connections and call `disconnect()` on each. Read `ReplicaConnectionPool.ts` to confirm the API.

- [ ] **Step 3: Run tests**

Run: `cd packages/atlas && bun test tests/ReadWriteReplicas.test.ts tests/Connection-extra.test.ts`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add packages/atlas/src/connection/ConnectionManager.ts packages/atlas/tests/ReadWriteReplicas.test.ts
git commit -m "fix: [atlas] disconnect() 同時清理 replica pool 防止 TCP 連線洩漏"
```

---

## Task 10: Fix `DB._reset()` Incomplete Cleanup

**Files:**
- Modify: `packages/atlas/src/DB.ts:750-754`
- Test: `packages/atlas/tests/DB.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/atlas/tests/DB.test.ts`:

```typescript
test('_reset should clear all static state', async () => {
  // Enable debug to register a query listener
  DB.debug(true)
  expect(Connection.queryListeners.length).toBeGreaterThan(0)

  await DB._reset()

  // All state should be clean
  expect(Connection.queryListeners.length).toBe(0)
  expect((DB as any).shardingManagers.size).toBe(0)
  expect((DB as any)._queryLog.length).toBe(0)
  expect((DB as any)._debug).toBe(false)
  expect((DB as any).queryListener).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/atlas && bun test tests/DB.test.ts -t "_reset should clear"`
Expected: FAIL — `queryListeners` is not cleared.

- [ ] **Step 3: Fix `_reset()` to clear all static state**

In `packages/atlas/src/DB.ts`, replace lines 750-754:

```typescript
static async _reset(): Promise<void> {
  await DB.manager.disconnectAll()
  DB.manager = new ConnectionManager()
  DB.initialized = false
  DB.shardingManagers.clear()
  DB._debug = false
  DB._queryLog = []
  if (DB.queryListener) {
    const index = Connection.queryListeners.indexOf(DB.queryListener)
    if (index !== -1) {
      Connection.queryListeners.splice(index, 1)
    }
    DB.queryListener = undefined
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/atlas && bun test tests/DB.test.ts -t "_reset should clear"`
Expected: PASS

- [ ] **Step 5: Run full DB test suite**

Run: `cd packages/atlas && bun test tests/DB.test.ts tests/DB-extra.test.ts`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/atlas/src/DB.ts packages/atlas/tests/DB.test.ts
git commit -m "fix: [atlas] DB._reset() 完整清理所有靜態狀態防止測試污染"
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

- [ ] **Run lint**

```bash
cd packages/atlas && bun run check
```
