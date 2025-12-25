# MongoDB

Atlas supports MongoDB natively, allowing you to use the same Model and Query Builder syntax you use for SQL databases with your NoSQL collections.

## Configuration

Add the MongoDB connection to your configuration:

```typescript
export default {
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: 'gravito_app',
    }
  }
}
```

## Model Definition

When using MongoDB, you should specify the connection on your model:

```typescript
import { Model, column } from '@gravito/atlas';

export default class Log extends Model {
  static override connection = 'mongodb';
  static override tableName = 'logs';
  static override primaryKey = '_id'; // MongoDB uses _id

  @column({ isPrimary: true })
  declare _id: string;

  @column()
  declare level: string;

  @column()
  declare message: string;
}
```

## Querying MongoDB

The Query Builder automatically translates its operations into MongoDB commands.

### Simple Queries
```typescript
const logs = await Log.where('level', 'error').get();
```

### Full-text Search & Regex
You can use regex operators for flexible searching:
```typescript
const users = await User.where('name', 'like', 'John%').get();
// Translates to: { name: { $regex: /^John/i } }
```

## Advanced Querying

### Aggregation Pipeline

Atlas provides a smooth abstraction for MongoDB's aggregation pipeline:

```typescript
const stats = await Log.query().aggregate([
  { $match: { level: 'error' } },
  { $group: { _id: '$channel', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

### Projections

Specify exactly which fields to return using the `select` method, which translates to MongoDB projections:

```typescript
const users = await User.select('name', 'email').get();
// Translates to: collection.find({}, { projection: { name: 1, email: 1 } })
```

## Transactions

Atlas supports multi-document transactions for MongoDB (requires Replica Set or Sharded Cluster):

```typescript
const connection = DB.connection('mongodb');

await connection.transaction(async (session) => {
  await User.create({ name: 'Alice' }, { session });
  await Profile.create({ user_id: '...', bio: 'Hello' }, { session });
});
```

Note: `Model.create()` is async and persists immediately. Use `Model.make()` if you need an in-memory instance before calling `save()`.

## Advanced Indexing

You can define complex indexes using Atlas migrations:

```typescript
import { Schema } from '@gravito/atlas';

await Schema.connection('mongodb').table('products', (table) => {
  // Simple index
  table.index('sku', { unique: true });
  
  // Compound index
  table.index({ category: 1, price: -1 });
  
  // TTL index (automatically delete logs after 30 days)
  table.index('created_at', { expireAfterSeconds: 3600 * 24 * 30 });
});
```

## Geospatial Queries

If you use the MongoDB driver, Atlas supports geospatial indexing and querying:

```typescript
const nearPlaces = await Place
  .where('location', 'near', {
    $geometry: { type: 'Point', coordinates: [ -73.9667, 40.78 ] },
    $maxDistance: 1000
  })
  .get();
```
