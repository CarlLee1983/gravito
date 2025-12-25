# Database Migrations

Migrations are like version control for your database, allowing your team to modify and share the application's database schema.

## Generating Migrations

Use the `orbit` CLI to create a new migration:

```bash
bun orbit make:migration create_users_table
```

The new migration will be placed in your `database/migrations` directory.

## Migration Structure

A migration contains a `Blueprint` that defines the table structure:

```typescript
import { Migration, Blueprint, Schema } from '@gravito/atlas';

export default class CreateUsersTable extends Migration {
  async up() {
    await Schema.create('users', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.timestamp('email_verified_at').nullable();
      table.string('password');
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('users');
  }
}
```

## Available Column Types

The database blueprint offers a wide variety of column types:

| Method | Description |
| --- | --- |
| `table.id()` | Alias for `bigIncrements('id')`. |
| `table.string('name', 255)` | VARCHAR equivalent. |
| `table.text('description')` | TEXT equivalent. |
| `table.integer('age')` | INTEGER equivalent. |
| `table.boolean('is_active')` | BOOLEAN equivalent. |
| `table.decimal('price', 8, 2)` | DECIMAL with precision and scale. |
| `table.json('options')` | JSON column. |
| `table.uuid('uid')` | UUID column. |
| `table.timestamps()` | Adds `created_at` and `updated_at`. |

## Column Modifiers

You can chain modifiers to columns:

```typescript
table.string('email').nullable();
table.string('role').default('user');
table.string('username').unique();
```

## Indexes & Foreign Keys

### Creating Indexes
```typescript
table.index(['email', 'status']);
table.unique('slug');
```

### Foreign Key Constraints
```typescript
table.bigInteger('user_id').unsigned();
table.foreign('user_id').references('id').on('users').onDelete('cascade');
```

## Running Migrations

To run all pending migrations, use the `migrate` command:

```bash
bun orbit migrate
```

To rollback the last batch of migrations:

```bash
bun orbit migrate:rollback
```
