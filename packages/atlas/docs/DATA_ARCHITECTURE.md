# Data Architecture Guide

Atlas is the **Data Gravity Core** of the Gravito ecosystem. This guide explains how to design your database layer following **Domain-Driven Design (DDD)** and **Clean Architecture** principles.

## 1. Domain-Driven Design (DDD) with Atlas

In Gravito, business logic (Satellites) should be decoupled from the raw database schema.

### The Repository Pattern

Instead of using `Model` directly in your business services, use the **Repository Pattern**.

```typescript
// satellites/catalog/src/repositories/ProductRepository.ts
import { User } from '../models/User'

export class UserRepository {
  async findActive() {
    return User.where('status', 'active').get()
  }
}
```

### Satellite Isolation

Each satellite should manage its own database lifecycle. Atlas supports multi-connection management to achieve this:

```typescript
// config/database.ts
export const databaseConfig = {
  connections: {
    main: { driver: 'postgres', ... },
    catalog: { driver: 'postgres', ... }, // Isolated DB for Catalog Satellite
  }
}
```

## 2. Shared Orbits & Cross-Domain Data

Infrastructure **Orbits** often need to persist data that is shared across satellites (e.g., `AuditLog`).

- **Shared Connection**: Orbits can share the `main` connection with the host application.
- **Global Middleware**: Use Atlas's global `DB.query` hooks to intercept and log queries across all satellites.

## 3. Distributed Transactions

When a business process spans multiple satellites, use **Unit of Work** or distributed transactions:

```typescript
import { DB } from '@gravito/atlas'

await DB.transaction(async (trx) => {
  // 1. Catalog Satellite logic
  await productService.reduceStock(id, 1, trx)
  
  // 2. Orders Satellite logic
  await orderService.create(orderData, trx)
})
```

## 4. Sharding Strategy

For massive scale, Atlas provides built-in horizontal sharding using the `@sharded` decorator:

```typescript
import { Model, sharded } from '@gravito/atlas'

@sharded({ key: 'user_id', shards: 16 })
export class Log extends Model {
  static table = 'logs'
}
```
