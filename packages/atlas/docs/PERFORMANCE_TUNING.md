# Performance Tuning Guide

Atlas is built for **Bun-native performance**. This guide covers optimization strategies for high-frequency applications.

## 1. Adaptive Connection Pooling

Atlas (v1.6.0+) includes an **Adaptive Pool Manager** that dynamically scales based on workload.

```typescript
// config/database.ts
export const config = {
  connections: {
    main: {
      driver: 'postgres',
      pool: {
        min: 5,
        max: 50,
        idleTimeout: 30000, // 30s
        adaptive: true,      // ⚡ Enable adaptive scaling
        healthCheck: 10000   // Check pool health every 10s
      }
    }
  }
}
```

## 2. Bun-Native SQLite (Memory & Local)

For extreme low-latency caching or local data, use the **`sqlite`** driver optimized for Bun's internal engine.

```typescript
const app = new DB({
  connections: {
    cache: {
      driver: 'sqlite',
      database: ':memory:' // Fast in-memory database
    }
  }
})
```

## 3. Query Optimization: SafeQueryBuilder

Avoid the overhead of full ORM model hydration when you only need raw data.

```typescript
// 🚀 High-performance raw query with SafeQueryBuilder
const data = await DB.connection('main').sql`
  SELECT id, email FROM users WHERE status = ${'active'}
`.all()
```

## 4. Prepared Statements

High-frequency queries should use **Prepared Statements** to reduce SQL parsing overhead.

```typescript
// Prepare once
const stmt = await DB.connection('main').prepare('SELECT * FROM users WHERE id = $1')

// Execute many times
const user1 = await stmt.execute([1])
const user2 = await stmt.execute([2])
```

## 5. N+1 Detection (Smart Guard)

In development mode, Atlas can automatically detect and log N+1 query patterns.

```typescript
// config/database.ts
export const config = {
  debug: true,
  logging: {
    nPlusOneDetection: true, // 🛡️ Alert on N+1 issues
    slowQueryLog: 200        // Log queries taking > 200ms
  }
}
```

## 6. Tree-shaking & Payload Size

Atlas is designed with **`sideEffects: false`**. To minimize your bundle size, use fine-grained imports:

```typescript
// ❌ Avoid
import { DB } from '@gravito/atlas'

// ✅ Preferred
import { PostgresDriver } from '@gravito/atlas/drivers/PostgresDriver'
import { QueryBuilder } from '@gravito/atlas/query/QueryBuilder'
```
