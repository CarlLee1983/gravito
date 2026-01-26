---
title: Migrations & Seeding
---

# Migrations & Seeding

> Provides a fluent schema definition (Blueprint) and data seeding (Factories/Seeders) toolkit.

## Database Migrations

Atlas provides `Schema` and `Blueprint` APIs, allowing you to define database table structures in code.

### Creating Tables

```ts
import { Blueprint, Schema } from '@gravito/atlas'

await Schema.create('users', (table: Blueprint) => {
  table.id() // Auto-incrementing ID
  table.string('name')
  table.string('email').unique()
  table.string('password').nullable()
  table.boolean('active').default(true)
  table.timestamps() // Automatically creates created_at and updated_at
})
```

### Modifying Tables

```ts
await Schema.table('users', (table: Blueprint) => {
  table.string('avatar').after('email')
  table.index(['name', 'email'], 'idx_name_email')
})
```

### Supported Column Types

- `id()`, `bigIncrements()`
- `string(name, length?)`, `text(name)`
- `integer(name)`, `bigInteger(name)`, `decimal(name, precision?, scale?)`
- `boolean(name)`
- `date(name)`, `dateTime(name)`, `timestamp(name)`
- `json(name)`, `jsonb(name)`
- `uuid(name)`

## Data Seeding

### Using Seeders

Seeders are used to populate the database with initial data.

```ts
import { DB, Seeder } from '@gravito/atlas'

export default class UserSeeder extends Seeder {
  async run() {
    await DB.table('users').insert([
      { name: 'Admin', email: 'admin@example.com' }
    ])
  }
}
```

### Using Factories

Factories help you quickly generate test data.

```ts
import { Factory } from '@gravito/atlas'

// Define a Factory
const UserFactory = Factory.define(User, ({ faker }) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  active: true
}))

// Use Factory to create data
await UserFactory.create() // Create one and save to DB
await UserFactory.count(10).create() // Create 10 records
```

## Running Migrations & Seeding

You can execute them via CLI or code:

### Via CLI

```bash
# Run all pending migrations
bun orbit migrate

# Run all seeders
bun orbit seed

# Rollback migrations
bun orbit migrate:rollback

# Fresh migration (drop all tables and re-run)
bun orbit migrate:fresh
```

### Via Code

```ts
import { Migrator, SeederRunner } from '@gravito/atlas'
import path from 'node:path'

// Run all pending migrations
const migrator = new Migrator({
  path: path.join(__dirname, 'database/migrations')
})
await migrator.run()

// Run all seeders
const seederRunner = new SeederRunner({
  path: path.join(__dirname, 'database/seeders')
})
await seederRunner.run()

// Run a specific seeder by name
await seederRunner.call('UserSeeder')
```
