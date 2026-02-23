---
title: Extending Gravito Atlas
---

# Extending Gravito Atlas

Gravito Atlas is designed to be extensible. This guide covers how to extend the ORM with custom capabilities, including adding new database drivers, extending models, and creating custom query macros.

## 1. Extending Models

### Custom Base Models

You can create a custom base model that all your application models inherit from. This is useful for adding shared methods or overrides.

```typescript
// src/models/AppModel.ts
import { Model } from '@gravito/atlas'

export class AppModel extends Model {
  /**
   * Helper to check if the model was created recently (within 24h)
   */
  isNew(): boolean {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return this.createdAt > twentyFourHoursAgo
  }

  /**
   * Override serialization to always remove password
   */
  toJSON() {
    const data = super.toJSON()
    delete data.password
    delete data.secret_key
    return data
  }
}

// Usage
import { column } from '@gravito/atlas'
import { AppModel } from './AppModel'

export class User extends AppModel {
  @column()
  declare password: string
}
```

### Model Mixins (Traits)

Since TypeScript doesn't support Traits natively like PHP, you can achieve similar functionality using **Class Composition** or **Mixins**.

```typescript
// src/models/traits/SoftDeletes.ts
import { Model, column } from '@gravito/atlas'

type Constructor<T = {}> = new (...args: any[]) => T

export function SoftDeletes<TBase extends Constructor<Model>>(Base: TBase) {
  return class extends Base {
    @column()
    declare deletedAt: Date | null

    get isDeleted(): boolean {
      return this.deletedAt !== null
    }

    async softDelete() {
      this.deletedAt = new Date()
      await this.save()
    }

    async restore() {
      this.deletedAt = null
      await this.save()
    }
  }
}

// Usage
class Post extends SoftDeletes(Model) {
  // ...
}
```

## 2. Custom Database Drivers

Atlas uses a driver-based architecture. If you need to support a new database (e.g., CockroachDB, TiDB, or a custom in-memory store), you can implement the `DriverContract`.

### The Driver Interface

```typescript
import type { 
  DriverContract, 
  QueryResult, 
  ExecuteResult, 
  DriverType 
} from '@gravito/atlas/types'

export class MyCustomDriver implements DriverContract {
  constructor(private config: any) {}

  getDriverName(): DriverType {
    return 'custom' as any
  }

  async connect(): Promise<void> {
    // Establish connection
  }

  async disconnect(): Promise<void> {
    // Close connection
  }

  async isConnected(): Promise<boolean> {
    // Check status
    return true
  }

  async query<T>(sql: string, bindings: unknown[]): Promise<QueryResult<T>> {
    // Execute SELECT query
    return {
      rows: [],
      rowCount: 0
    }
  }

  async execute(sql: string, bindings: unknown[]): Promise<ExecuteResult> {
    // Execute INSERT/UPDATE/DELETE
    return {
      affectedRows: 1,
      insertId: 123
    }
  }

  async beginTransaction(): Promise<void> { /* ... */ }
  async commit(): Promise<void> { /* ... */ }
  async rollback(): Promise<void> { /* ... */ }
}
```

### Registering the Driver

Currently, Atlas instantiates drivers based on the `driver` string in the config. To use a custom driver, you may need to patch or wrap the `DB` initialization logic, or contribute the driver to the core repository if it's generally useful.

*Note: In future versions, a `DB.registerDriver('name', DriverClass)` API is planned.*

## 3. Query Builder Macros (Concept)

While Atlas doesn't support run-time macros in the core Query Builder object yet, you can extend the Query Builder by using **Repository Pattern** or **Custom Scopes**.

### Scopes

Scopes allow you to define common sets of constraints that you can easily re-use.

```typescript
class User extends Model {
  // Define a static scope method
  static active(query) {
    return query.where('status', 'active').whereNull('deleted_at')
  }

  static popular(query) {
    return query.where('views', '>', 1000)
  }
}

// Usage
const popularUsers = await User.query()
  .apply(User.active)
  .apply(User.popular)
  .get()
```

## 4. Lifecycle Hooks

Models emit events during their lifecycle. You can hook into these by overriding the lifecycle methods.

```typescript
class User extends Model {
  async beforeSave() {
    if (this.isDirty('password')) {
      this.password = await hash(this.password)
    }
  }

  async afterCreate() {
    await Mailer.sendWelcomeEmail(this)
  }
  
  async beforeDelete() {
    // Cleanup related resources
  }
}
```

## 5. Custom Column Types

Atlas maps SQL types to JavaScript primitives. If you need special handling (e.g., Geometry types, Money objects), you can use **Getters/Setters** or **Transformers**.

```typescript
class Location extends Model {
  @column()
  declare coordinates: string // Stored as "lat,lng" string in DB

  // Virtual property
  get latLng() {
    const [lat, lng] = this.coordinates.split(',')
    return { lat: parseFloat(lat), lng: parseFloat(lng) }
  }

  set latLng(value: { lat: number; lng: number }) {
    this.coordinates = `${value.lat},${value.lng}`
  }
}
```

## 6. Contributing to Atlas

If you've built a useful extension or driver, consider contributing it back!

1.  Fork the repository.
2.  Create your feature branch.
3.  Add tests (we use `bun test`).
4.  Submit a Pull Request.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more details.
