# Database Getting Started

This guide will walk you through setting up a database connection and performing basic CRUD operations using the Query Builder.

::: info Looking for ORM?
If you want to use object-oriented Models, please refer to the [Atlas ORM Quick Start](./orm-quick-start).
:::

## 1. Installation

Atlas runs on top of the `@gravito/atlas` package.

```bash
bun add @gravito/atlas
```

Depending on your database, you also need the underlying driver:

```bash
# For PostgreSQL
bun add pg

# For MySQL / MariaDB
bun add mysql2

# For SQLite
bun add better-sqlite3 # or use bun:sqlite (built-in)

# For MongoDB
bun add mongodb

# For Redis
bun add ioredis
```

## 2. Configuration

Configure your database connections. Atlas supports multiple concurrent connections.

```typescript
import { DB } from '@gravito/atlas';

DB.configure({
  default: 'postgres',

  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      database: 'gravito_app',
      username: 'postgres',
      password: 'password',
    },
    
    sqlite: {
      driver: 'sqlite',
      database: 'database.sqlite',
    },

    mongodb: {
      driver: 'mongodb',
      url: 'mongodb://localhost:27017/gravito',
      database: 'gravito',
    }
  }
});
```

## 3. Basic Usage (Query Builder)

Once configured, you can use `DB.table()` for fluent database interactions.

### Inserting Data

```typescript
// Insert single record
await DB.table('users').insert({
  name: 'Alice',
  email: 'alice@example.com',
  created_at: new Date()
});

// Insert multiple records
await DB.table('users').insert([
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
]);
```

### Selecting Data

```typescript
// Get all records
const users = await DB.table('users').get();

// Conditional query
const admin = await DB.table('users')
  .where('role', 'admin')
  .first();

// Select specific columns
const emails = await DB.table('users')
  .select('email')
  .where('active', true)
  .get();
```

### Updating Data

```typescript
await DB.table('users')
  .where('id', 1)
  .update({ name: 'Alice Wonderland' });
```

### Deleting Data

```typescript
await DB.table('users')
  .where('active', false)
  .delete();
```

## Next Steps

- Explore the powerful [Query Builder](./query-builder).
- Learn how to use [Atlas ORM](./orm-quick-start) for object-oriented development.
- Understand [Migrations](./migrations) to manage your database schema.