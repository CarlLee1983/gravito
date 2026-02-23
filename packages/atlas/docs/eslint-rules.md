# ESLint Rules for SQL Safety (@gravito/eslint-plugin-atlas)

This ESLint plugin detects SQL injection vulnerabilities and unsafe query patterns when using @gravito/atlas.

## Installation

```bash
bun add -D @gravito/eslint-plugin-atlas
```

## Configuration

### Recommended (Default)

```javascript
// eslint.config.js
import atlas from '@gravito/eslint-plugin-atlas'

export default [
  {
    plugins: {
      atlas,
    },
    rules: {
      'atlas/no-unsafe-raw': 'warn',
      'atlas/sql-injection-risk': 'error',
    },
  },
]
```

### Strict Mode

For security-sensitive projects:

```javascript
export default [
  atlas.configs.strict,
]
```

## Rules

### `atlas/no-unsafe-raw`

Detects potentially unsafe `db.raw()` usage patterns and suggests migration to `db.sql`.

**Severity**: Warning (default) / Error (strict)

#### ❌ Bad Examples

```typescript
// Template literal with expressions
const user = await db.raw(`SELECT * FROM users WHERE id = ${id}`)

// String variable without bindings
const query = buildQuery()
await db.raw(query)

// String concatenation
const sql = 'SELECT * FROM users WHERE id = ' + id
await db.raw(sql)
```

#### ✅ Good Examples

```typescript
// Tagged template literal (safe parameter binding)
const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()

// Raw with parameter bindings
const user = await db.raw('SELECT * FROM users WHERE id = ?', [id])

// Static SQL literal
const users = await db.raw('SELECT * FROM users WHERE active = true')
```

#### Configuration

```javascript
{
  'atlas/no-unsafe-raw': ['warn', {
    allowLiterals: true  // Allow db.raw() with static SQL strings
  }]
}
```

### `atlas/sql-injection-risk`

Detects potential SQL injection vulnerabilities by identifying:
- String concatenation in SQL queries
- Template literals with unescaped variable interpolation
- Missing `identifier()` for dynamic table/column names

**Severity**: Error

#### ❌ Bad Examples

```typescript
// Concatenation with variables
const query = 'SELECT * FROM ' + table + ' WHERE id = ' + id
await db.raw(query)

// Direct variable in table position (no identifier())
const tableName = req.body.table
const data = await db.sql`SELECT * FROM ${tableName}`.all()

// Template literal in raw() with interpolation
const id = req.body.id
const sql = `SELECT * FROM users WHERE id = ${id}`
await db.raw(sql)
```

#### ✅ Good Examples

```typescript
// Use identifier() for dynamic table/column names
import { identifier } from '@gravito/atlas'

const tableName = identifier(req.body.table)  // Validated
const data = await db.sql`SELECT * FROM ${tableName}`.all()

// Use tagged templates for parameter binding
const id = req.body.id
const data = await db.sql`SELECT * FROM users WHERE id = ${id}`.all()

// Use parameter arrays with db.raw()
const id = req.body.id
const data = await db.raw('SELECT * FROM users WHERE id = ?', [id])
```

## Migration Guide

### From `db.raw()` with String Interpolation

**Before** (Unsafe ❌):
```typescript
const userId = req.body.userId
const user = await db.raw(`SELECT * FROM users WHERE id = ${userId}`)
```

**After** (Safe ✅):
```typescript
const userId = req.body.userId
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()
```

### From `db.raw()` with Parameter Arrays

**Before**:
```typescript
const user = await db.raw('SELECT * FROM users WHERE id = ?', [userId])
```

**After** (Both valid, but `db.sql` is preferred):
```typescript
// Option 1: Use tagged template
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()

// Option 2: Keep parameter array (still safe)
const result = await db.raw('SELECT * FROM users WHERE id = ?', [userId])
```

### From String Concatenation

**Before** (Unsafe ❌):
```typescript
const table = req.query.table
const column = req.query.column
const query = `SELECT ${column} FROM ${table} WHERE active = true`
await db.raw(query)
```

**After** (Safe ✅):
```typescript
import { identifier } from '@gravito/atlas'

const table = identifier(req.query.table)    // Validated
const column = identifier(req.query.column)  // Validated
const data = await db.sql`SELECT ${column} FROM ${table} WHERE active = ${true}`.all()
```

## Best Practices

### 1. Always Use Tagged Templates for User Input

```typescript
// ✅ Safe
const email = req.body.email
const user = await db.sql`SELECT * FROM users WHERE email = ${email}`.first()

// ❌ Unsafe
const query = `SELECT * FROM users WHERE email = '${email}'`
await db.raw(query)
```

### 2. Use `identifier()` for Table and Column Names

```typescript
import { identifier } from '@gravito/atlas'

// ✅ Safe - validated identifiers
const table = identifier('users')
const column = identifier('email')
const result = await db.sql`SELECT ${column} FROM ${table}`.all()

// ❌ Unsafe - no validation
const result = await db.raw(`SELECT * FROM ${table}`)
```

### 3. Prefer `db.sql` Over `db.raw()`

```typescript
// ✅ Preferred - cleaner, safer
const users = await db.sql`SELECT * FROM users WHERE active = ${true}`.all()

// ⚠️ Still safe but more verbose
const users = await db.raw('SELECT * FROM users WHERE active = ?', [true])
```

### 4. Type Your Query Results

```typescript
interface User {
  id: number
  email: string
  name: string
}

// ✅ Type-safe result
const user = await db.sql<User>`SELECT * FROM users WHERE id = ${id}`.first()
```

## Disabling Rules

In rare cases where you need to disable these rules:

```typescript
// Disable for a single line
// eslint-disable-next-line atlas/no-unsafe-raw
await db.raw(dangerousQuery)

// Disable for a block
/* eslint-disable atlas/sql-injection-risk */
const tableName = userProvidedTable
/* eslint-enable atlas/sql-injection-risk */

// Disable for entire file (not recommended)
/* eslint-disable atlas/no-unsafe-raw */
```

## FAQ

### Q: Why does `db.raw()` with static SQL trigger a warning?

**A**: The rule recommends `db.sql` for consistency and to establish a safe-by-default practice. You can disable this warning with `allowLiterals: false` in your config.

### Q: Can I use `db.raw()` with parameter arrays?

**A**: Yes, `db.raw(sql, [params])` is safe when parameter binding is used. The rule only warns about unsafe patterns like string interpolation.

### Q: What if my table/column name comes from a whitelist?

**A**: Use `identifier()` which validates against a whitelist. Even if your list is safe, using `identifier()` makes the safety explicit and is the recommended pattern.

### Q: Does this rule catch all SQL injection attacks?

**A**: This rule catches common patterns, but no static analysis can catch 100% of injection attacks. Always validate user input at system boundaries and use parameter binding as the primary defense.

## Integration with Development Workflow

### Pre-commit Hook

Add to your `lint-staged` configuration:

```javascript
// .husky/pre-commit
{
  "*.{ts,tsx}": ["eslint --fix"]
}
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Lint with ESLint
  run: |
    bun run lint
    bun run lint:atlas  # Run atlas-specific rules
```

### VS Code Integration

Install the official ESLint extension, which will show violations inline as you type.

## See Also

- [Safe Queries Guide](./safe-queries.md) - Complete SafeQueryBuilder documentation
- [Security Best Practices](./CONTRIBUTING.md#security-best-practices) - Project security guidelines
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection) - SQL injection vulnerability details
