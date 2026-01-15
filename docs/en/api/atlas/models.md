---
title: Models
---

# Models

> Based on Atlas’s Active Record pattern implementation, providing a Laravel Eloquent-like experience.

## Defining a Model

Inherit from the `Model` class and specify the `table` name.

```ts
import { Model, column } from '@gravito/atlas'

export class User extends Model {
  // Define table name
  static table = 'users'
  
  // Primary key (defaults to 'id')
  static primaryKey = 'id'

  // Mark database columns with @column()
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare active: boolean
}
```

## Basic Operations

### Querying Records

```ts
// Find by ID
const user = await User.find(1)

// Using the Query Builder
const users = await User.query()
  .where('active', true)
  .orderBy('created_at', 'desc')
  .get()

// Get first matching record
const user = await User.where('email', 'john@example.com').first()
```

### Create & Update

```ts
// Create a new instance
const user = new User()
user.name = 'John Doe'
await user.save()

// Using static shorthand
const user = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com'
})

// Update attributes
user.name = 'Updated Name'
await user.save()

// Or update directly
await user.update({ name: 'New Name' })
```

### Deleting Records

```ts
const user = await User.find(1)
await user.delete()

// If soft deletes are enabled, use forceDelete to truly remove it
await user.forceDelete()
```

## Advanced Features

### Attribute Casting

Automatically convert raw database values into specified types.

```ts
export class User extends Model {
  static casts = {
    age: 'number',
    is_active: 'boolean',
    metadata: 'json',
    tags: 'array',
    birthday: 'date'
  }
}
```

### Fillable / Guarded

Prevent malicious users from modifying sensitive attributes via mass assignment.

```ts
export class User extends Model {
  // Whitelist: fields allowed for mass assignment
  static fillable = ['name', 'email']

  // Or Blacklist: fields forbidden from mass assignment
  // static guarded = ['is_admin']
}
```

### Timestamps

Atlas automatically manages `created_at` and `updated_at` columns by default.

```ts
export class User extends Model {
  static timestamps = true // Default is true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'
}
```

### Soft Deletes

```ts
export class User extends Model {
  static usesSoftDeletes = true
  static deletedAtColumn = 'deleted_at'
}

// Query including trashed records
const users = await User.withTrashed().get()

// Only query trashed records
const users = await User.onlyTrashed().get()

// Restore a trashed record
await user.restore()
```

## Model Events

You can listen to model lifecycle events via Gravito’s Hooks system:

- `model:creating` / `model:created`
- `model:updating` / `model:updated`
- `model:saving` / `model:saved`
- `model:deleting` / `model:deleted`

See the [ORM Usage Guide](../../guide/orm-usage.md#model-events) for details.
