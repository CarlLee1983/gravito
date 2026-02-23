# Safe Queries - SQL Injection Protection Guide

## Overview

**SafeQueryBuilder** provides SQL injection-proof queries through **tagged template literals** and **parameter binding**. This guide explains the API, migration path, and best practices.

## The Problem: SQL Injection

SQL injection occurs when user input is concatenated directly into SQL strings:

```typescript
// ❌ DANGEROUS - Never do this!
const email = getUserInput() // e.g., "'; DROP TABLE users;--"
const query = `SELECT * FROM users WHERE email = '${email}'`
await db.raw(query)
// Executed: SELECT * FROM users WHERE email = ''; DROP TABLE users;--'
```

## The Solution: Parameter Binding

SafeQueryBuilder prevents injection by separating SQL structure from data:

```typescript
// ✅ SAFE - Parameters are bound, not concatenated
const email = getUserInput()
const users = await db.sql`SELECT * FROM users WHERE email = ${email}`.all()
// SQL: SELECT * FROM users WHERE email = $1
// Bindings: ["'; DROP TABLE users;--"]
```

## API Reference

### Basic Query

```typescript
const result = await db.sql`SELECT * FROM users`.all()
```

### With Parameters

```typescript
const userId = 123
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()
```

### Multiple Parameters

```typescript
const name = 'Alice'
const email = 'alice@example.com'
const status = 'active'

const users = await db.sql`
  SELECT * FROM users
  WHERE name = ${name}
    AND email = ${email}
    AND status = ${status}
`.all()
```

### Date and Type Conversion

```typescript
const startDate = new Date('2024-01-01')
const endDate = new Date('2024-12-31')
const isActive = true

const events = await db.sql`
  SELECT * FROM events
  WHERE created_at BETWEEN ${startDate} AND ${endDate}
    AND active = ${isActive}
`.all()
```

### Result Methods

#### `.all()` - Get All Rows

```typescript
const users: User[] = await db.sql<User>`SELECT * FROM users`.all()
```

#### `.first()` - Get First Row

```typescript
const user: User | null = await db.sql<User>`
  SELECT * FROM users WHERE id = ${userId}
`.first()
```

#### `.execute()` - Get Full Result

```typescript
const result = await db.sql`INSERT INTO users (name) VALUES (${name})`.execute()
console.log(result.rowCount)    // 1
console.log(result.insertId)    // undefined or new ID
console.log(result.rows)        // []
```

#### `.toExpression()` - Use with QueryBuilder

```typescript
const subquery = db.sql`SELECT id FROM users WHERE active = ${true}`.toExpression()
const posts = await db.table('posts')
  .whereIn('user_id', subquery)
  .get()
```

## Safe Identifiers (Table/Column Names)

User input in table or column names requires validation via `identifier()`:

```typescript
import { identifier } from '@gravito/atlas'

// ✅ Safe - validated against whitelist
const table = identifier('users')
const column = identifier('email')

const result = await db.sql`SELECT ${column} FROM ${table}`.all()

// ❌ Throws Error - invalid identifier
identifier("users'; DROP TABLE--")
identifier("email`; DELETE--")
identifier("123invalid")  // Can't start with number
```

### Valid Identifier Rules

- Start with: `[a-zA-Z_]`
- Followed by: `[a-zA-Z0-9_.]` (dots allow schema.table notation)
- Examples:
  - ✅ `users`
  - ✅ `user_profiles`
  - ✅ `public.users` (schema qualified)
  - ✅ `_internal`
  - ❌ `123users` (starts with number)
  - ❌ `users;` (contains semicolon)
  - ❌ `users'` (contains quote)

## Type Safety

### Basic Typing

```typescript
interface User {
  id: number
  name: string
  email: string
}

const user = await db.sql<User>`SELECT * FROM users WHERE id = ${id}`.first()
// Type: User | null ✅
```

### Query Results

```typescript
// Return type inference
const result = await db.sql`SELECT id, name FROM users`.all()
// Type: Record<string, unknown>[] (default)

// With explicit type
interface UserPreview {
  id: number
  name: string
}

const preview = await db.sql<UserPreview>`
  SELECT id, name FROM users LIMIT 10
`.all()
// Type: UserPreview[] ✅
```

## Migration Guide

### From `raw()` to `sql()`

**Before:**
```typescript
// ❌ String concatenation (SQL injection risk)
const userId = req.body.id
const query = `SELECT * FROM users WHERE id = ${userId}`
const users = await db.raw(query)
```

**After:**
```typescript
// ✅ Parameter binding (safe)
const userId = req.body.id
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`.all()
```

### From String Interpolation

**Before:**
```typescript
// ❌ Vulnerable
const email = getUserEmail()
const sql = `SELECT * FROM users WHERE email = '${email}'`
const result = await db.raw(sql)
```

**After:**
```typescript
// ✅ Safe
const email = getUserEmail()
const result = await db.sql`SELECT * FROM users WHERE email = ${email}`.all()
```

### With Dynamic Table/Column Names

**Before:**
```typescript
// ❌ Hard to secure
const table = req.query.table
const column = req.query.column
const sql = `SELECT ${column} FROM ${table}`
const result = await db.raw(sql)
```

**After:**
```typescript
// ✅ Validated and safe
import { identifier } from '@gravito/atlas'

const table = identifier(req.query.table) // Throws if invalid
const column = identifier(req.query.column)
const result = await db.sql`SELECT ${column} FROM ${table}`.all()
```

## Best Practices

### 1. Always Use Parameter Binding for User Input

```typescript
// ✅ Good
const userId = req.body.userId
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`.all()

// ❌ Bad
const query = `SELECT * FROM users WHERE id = ${req.body.userId}`
await db.raw(query)
```

### 2. Use `identifier()` for Dynamic Names

```typescript
// ✅ Good - with validation
const table = identifier(req.query.table)
const users = await db.sql`SELECT * FROM ${table}`.all()

// ❌ Bad - no validation
const users = await db.raw(`SELECT * FROM ${req.query.table}`)
```

### 3. Avoid String Concatenation

```typescript
// ✅ Good - uses SafeQueryBuilder
const name = 'Alice'
const users = await db.sql`SELECT * FROM users WHERE name = ${name}`.all()

// ❌ Bad - concatenation
const users = await db.raw(`SELECT * FROM users WHERE name = '${name}'`)
```

### 4. Type Your Results

```typescript
// ✅ Good - explicit typing
interface User {
  id: number
  name: string
  email: string
}

const user = await db.sql<User>`SELECT * FROM users WHERE id = ${id}`.first()

// ⚠️ Okay - implicit typing
const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()
// Type: Record<string, unknown> | null
```

### 5. Use `.first()` for Single Results

```typescript
// ✅ Good - single row expected
const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()

// ⚠️ Verbose - when you need first of many
const [user] = await db.sql`SELECT * FROM users WHERE id = ${id}`.all()
```

## SQL Injection Test Vectors

The SafeQueryBuilder successfully prevents these common attacks:

```typescript
// All of these are handled safely
const payloads = [
  "Robert'; DROP TABLE users;--",
  "1 OR 1=1",
  "1; DELETE FROM users",
  "' UNION SELECT * FROM passwords --",
  "1' AND '1'='1",
  "' OR ''='",
  "admin'--",
  "1/**/OR/**/1=1",
  "' AND (SELECT COUNT(*) FROM users)>0 --",
  "1' OR SLEEP(5)--",
  "' UNION ALL SELECT NULL--",
  "BENCHMARK(10000000,MD5('A'))--",
]

for (const payload of payloads) {
  // ✅ All safe - parameter binding prevents injection
  const result = await db.sql`SELECT * FROM users WHERE name = ${payload}`.all()
}
```

## Performance Considerations

SafeQueryBuilder has minimal overhead:

- **Compilation**: ~60-100 ns per query (benchmarked)
- **Parameter Binding**: O(1) per parameter
- **No Query Plan Recompilation**: Database reuses parsed statements

```typescript
// Benchmark results (on M4 CPU)
// Simple SELECT compilation:    ~75 ns
// 5-parameter binding:           ~157 ns
// 10-parameter binding:          ~307 ns
// SafeIdentifier validation:     ~85 ns
```

## Error Handling

### Invalid Identifiers

```typescript
try {
  const table = identifier("users'; DROP--")
  // Throws: Invalid SQL identifier
} catch (error) {
  console.error(error.message)
  // "Invalid SQL identifier: \"users'; DROP--\".
  // Identifiers must start with letter or underscore, and contain
  // only alphanumeric characters, underscores, and dots."
}
```

### Query Execution Errors

```typescript
try {
  const users = await db.sql`SELECT * FROM invalid_table`.all()
} catch (error) {
  console.error(error.message)
  // Database-specific error from driver
}
```

## FAQ

### Q: Can I use `.sql` with transactions?

**A:** Yes! The connection is preserved:

```typescript
const user = await db.transaction(async (trx) => {
  const result = await trx.sql`
    INSERT INTO users (name) VALUES (${name})
  `.execute()
  return result
})
```

### Q: How does it handle NULL values?

**A:** NULL is handled correctly:

```typescript
const deletedAt = null
const users = await db.sql`
  SELECT * FROM users WHERE deleted_at = ${deletedAt}
`.all()
// Generates: WHERE deleted_at = NULL (not = NULL in SQL)
```

### Q: Can I use expressions in parameters?

**A:** No - only values. For SQL expressions, use `identifier()` or `.toExpression()`:

```typescript
// ❌ Wrong - COUNT(*) is not executed
const result = await db.sql`SELECT ${COUNT(*)} FROM users`.all()

// ✅ Correct - use raw function or query builder
import { raw } from '@gravito/atlas'
const result = await db.table('users')
  .select(raw('COUNT(*) as total'))
  .first()
```

### Q: Is SafeQueryBuilder faster than QueryBuilder?

**A:** Generally comparable for simple queries, but QueryBuilder adds abstraction overhead for complex builds. Use SafeQueryBuilder for raw SQL performance, QueryBuilder for fluent DSL.

```typescript
// SafeQueryBuilder - direct SQL
const users = await db.sql`SELECT * FROM users WHERE active = ${true}`.all()

// QueryBuilder - fluent DSL
const users = await db.table('users').where('active', true).get()
// Both efficient, just different APIs
```

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Drivers](./drivers.md) - Database driver setup
- [Query Builder](./query-builder.md) - Advanced query construction
- [ORM](./orm.md) - Active Record models

