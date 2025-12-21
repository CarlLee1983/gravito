# @gravito/dark-matter

> MongoDB client for Gravito - Bun native, Laravel-style API

## Installation

```bash
bun add @gravito/dark-matter mongodb
```

## Quick Start

```typescript
import { Mongo } from '@gravito/dark-matter'

// Configure
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'myapp' }
  }
})

// Connect
await Mongo.connect()

// Use
const users = await Mongo.collection('users')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()

// Disconnect
await Mongo.disconnect()
```

## Features

- 🚀 **Bun Native** - Optimized for Bun runtime
- 🎯 **Laravel-style API** - Familiar fluent interface
- 🔍 **Query Builder** - Type-safe query building
- 📊 **Aggregation Pipeline** - Fluent aggregation API
- 🔌 **Multi-connection** - Named connections support

## API Reference

### Query Builder

```typescript
// Basic queries
const users = await Mongo.collection('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .whereIn('role', ['admin', 'editor'])
  .get()

// Sorting & Pagination
const latest = await Mongo.collection('posts')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .skip(20)
  .get()

// Select specific fields
const names = await Mongo.collection('users')
  .select('name', 'email')
  .get()

// Find by ID
const user = await Mongo.collection('users').find('507f1f77bcf86cd799439011')

// Count & Exists
const count = await Mongo.collection('users').where('status', 'active').count()
const exists = await Mongo.collection('users').where('email', 'john@example.com').exists()
```

### CRUD Operations

```typescript
// Insert
const result = await Mongo.collection('users').insert({
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
})
console.log(result.insertedId)

// Insert Many
const results = await Mongo.collection('users').insertMany([
  { name: 'Alice' },
  { name: 'Bob' }
])

// Update
await Mongo.collection('users')
  .where('_id', userId)
  .update({ status: 'inactive' })

// Update Many
await Mongo.collection('users')
  .where('status', 'pending')
  .updateMany({ status: 'active' })

// Delete
await Mongo.collection('users')
  .where('_id', userId)
  .delete()

// Delete Many
await Mongo.collection('users')
  .where('status', 'deleted')
  .deleteMany()
```

### Aggregation Pipeline

```typescript
// Group and count
const stats = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'completed' })
  .group({
    _id: '$customerId',
    totalOrders: { $sum: 1 },
    totalAmount: { $sum: '$amount' }
  })
  .sort({ totalAmount: 'desc' })
  .limit(10)
  .get()

// Lookup (JOIN)
const ordersWithCustomers = await Mongo.collection('orders')
  .aggregate()
  .lookup({
    from: 'customers',
    localField: 'customerId',
    foreignField: '_id',
    as: 'customer'
  })
  .unwind('$customer')
  .get()

// Project specific fields
const projected = await Mongo.collection('users')
  .aggregate()
  .project({
    name: 1,
    email: 1,
    fullName: { $concat: ['$firstName', ' ', '$lastName'] }
  })
  .get()
```

### Multiple Connections

```typescript
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'app' },
    analytics: { uri: 'mongodb://analytics.example.com:27017', database: 'analytics' }
  }
})

// Use specific connection
const data = await Mongo.connection('analytics')
  .collection('events')
  .where('type', 'pageview')
  .get()
```

## Roadmap

- [ ] Schema validation
- [ ] Transactions
- [ ] Change streams
- [ ] GridFS support

## License

MIT
