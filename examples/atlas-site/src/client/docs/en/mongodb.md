# Orbit Connection: MongoDB Protocol

> **Status:** Planetary Scale Document Flux Active.
> Atlas provides a high-performance, fluent interface for MongoDB that mirrors the developer experience of our SQL core.

## The Connection Blueprint

In Atlas, NoSQL isn't a second-class citizen. It's an extension of the same data governance philosophy.

```typescript
// atlas.config.ts
export default defineConfig({
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: process.env.MONGO_URI,
      database: 'gravito_flux',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    }
  }
})
```

## MongoDB: The Cosmic Document Store

Connect your Atlas application to MongoDB clusters with high-performance document operations.

## Configuration

Add your MongoDB connection to the `DB` configuration:

```typescript
DB.configure({
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: 'mongodb://localhost:27017',
      database: 'atlas_site'
    }
  }
})
```

## ORM Models

Atlas extends its ORM capabilities to MongoDB. You can define models that interact directly with MongoDB collections:

```typescript
import { Model } from '@gravito/atlas'

export default class Log extends Model {
    static connection = 'mongodb'
    static tableName = 'logs'
}
```

### CRUD Operations

Using MongoDB models feels just like using SQL models:

```typescript
// Create a new document
const log = await Log.create({
    level: 'info',
    message: 'Cosmic orbit established',
    context: { orbit: 'low_earth' }
})

// Query documents
const errors = await Log.query()
    .where('level', 'error')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get()

// Update
await log.save({
    resolved: true
})

// Delete
await log.delete()
```

## Collection Proxy

You can also access the native collection proxy for advanced operations:

```typescript
const collection = await DB.connection('mongodb').collection('logs')
const result = await collection.aggregate([
  { $match: { level: 'error' } },
  { $group: { _id: '$message', count: { $sum: 1 } } }
]).toArray()
```

## Fluent Document Access

Access your collections with the same expressive power you use for SQL tables.

```typescript
import { DB } from '@gravito/atlas'

// Retrieve critical system logs
const criticalLogs = await DB.connection('mongodb')
  .collection('system_logs')
  .where('status', 'critical')
  .limit(50)
  .get()

// Deep document filtering
const deepSearch = await DB.connection('mongodb')
  .collection('users')
  .where('profile.metrics.score', '>', 9000)
  .first()
```

## Why MongoDB in Atlas?

Atlas wraps the native MongoDB driver in a **Laravel-inspired Proxy**. You get all the power of raw aggregation when you need it, but most of the time, you'll stay within the safety of our fluent API.

- **Unified Error Handling:** Catch database exceptions with a single pattern.
- **Connection Resilience:** Automatic reconnection and pooling.
- **BSON-to-JSON Precision:** Built-in serialization for edge delivery.
