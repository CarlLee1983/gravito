# Fluent Query Builder

The Query Builder is the powerhouse of Atlas. It provides a chainable API to build complex SQL/NoSQL queries with full type safety.

## 🏁 Getting Started

Use the `DB` facade to start a query.

```typescript
import { DB } from '@gravito/atlas'

const users = await DB.table('users').select('id', 'name').get()
```

## 🛠️ Clause Methods

### Where Clauses
```typescript
query.where('age', '>', 18)
query.whereNull('deleted_at')
query.whereIn('id', [1, 2, 3])
query.whereBetween('price', [10, 100])
```

### Logical Grouping
```typescript
query.where((q) => {
  q.where('role', 'admin').orWhere('role', 'super')
})
```

### Joins
```typescript
query.join('profiles', 'users.id', '=', 'profiles.user_id')
query.leftJoin('posts', 'users.id', '=', 'posts.author_id')
```

### Aggregates
```typescript
const count = await DB.table('users').count()
const maxPrice = await DB.table('orders').max('amount')
```

## 🚀 Performance Features

### Copy-on-Write (CoW)
Cloning a query is a zero-cost operation until you modify the clone. This is useful for building "base queries" and extending them.

```typescript
const base = DB.table('users').where('active', true)

const admins = base.clone().where('role', 'admin').get()
const editors = base.clone().where('role', 'editor').get()
```

### Raw Expressions
When you need to go beyond the builder, use `DB.raw()`.

```typescript
DB.table('users')
  .select('id', DB.raw('CONCAT(first_name, " ", last_name) as full_name'))
  .get()
```

## 📡 Transactions

Atlas supports nested transactions with automatic rollback on failure.

```typescript
await DB.transaction(async (trx) => {
  await trx.table('accounts').decrement('balance', 100)
  await trx.table('logs').insert({ action: 'withdraw' })
})
```
