# @gravito/plasma

> Redis client for Gravito - Bun native, Laravel-style API

## Installation

```bash
# 使用 Bun.redis（推薦，無需額外依賴）
bun add @gravito/plasma

# 或使用 ioredis（作為 fallback）
bun add @gravito/plasma ioredis
```

## Quick Start

```typescript
import { Redis } from '@gravito/plasma'

// Configure
Redis.configure({
  default: 'main',
  connections: {
    main: { host: 'localhost', port: 6379 }
  }
})

// Connect
await Redis.connect()

// Use
await Redis.set('user:123', JSON.stringify({ name: 'John' }), { ex: 3600 })
const user = await Redis.get('user:123')

// Disconnect
await Redis.disconnect()
```

## Features

- 🚀 **Bun Native** - Uses Bun.redis by default (no external dependencies needed)
- 🎯 **Laravel-style API** - Familiar fluent interface
- 📦 **Full Data Types** - String, Hash, List, Set, Sorted Set
- 🔄 **Pipeline Support** - Batch operations
- 📡 **Pub/Sub** - Real-time messaging
- 🔌 **Multi-connection** - Named connections support
- 🔄 **Auto Fallback** - Automatically falls back to ioredis if Bun.redis is unavailable

## API Reference

### String Operations

```typescript
await Redis.set('key', 'value')
await Redis.set('key', 'value', { ex: 3600 })  // TTL in seconds
await Redis.set('key', 'value', { nx: true })  // Only if not exists

const value = await Redis.get('key')
await Redis.del('key')
await Redis.incr('counter')
await Redis.decr('counter')
```

### Hash Operations

```typescript
await Redis.hset('user:123', { name: 'John', email: 'john@example.com' })
const name = await Redis.hget('user:123', 'name')
const user = await Redis.hgetall('user:123')
await Redis.hincrby('user:123', 'visits', 1)
```

### List Operations

```typescript
await Redis.lpush('queue', 'job1', 'job2')
const job = await Redis.rpop('queue')
const jobs = await Redis.lrange('queue', 0, -1)
```

### Set Operations

```typescript
await Redis.sadd('tags', 'typescript', 'redis', 'bun')
const tags = await Redis.smembers('tags')
const isMember = await Redis.sismember('tags', 'redis')
```

### Sorted Set Operations

```typescript
await Redis.zadd('leaderboard', { score: 100, member: 'player1' })
const top10 = await Redis.zrevrange('leaderboard', 0, 9)
const rank = await Redis.zrank('leaderboard', 'player1')
```

### TTL Management

```typescript
await Redis.expire('session', 3600)
const ttl = await Redis.ttl('session')
await Redis.persist('session')  // Remove TTL
```

### Pipeline

```typescript
const results = await Redis.pipeline()
  .set('key1', 'value1')
  .set('key2', 'value2')
  .get('key1')
  .incr('counter')
  .exec()
```

### Pub/Sub

```typescript
// Publisher
await Redis.publish('notifications', JSON.stringify({ type: 'alert', message: 'Hello!' }))

// Subscriber
await Redis.subscribe('notifications', (message, channel) => {
  console.log(`Received on ${channel}:`, message)
})
```

### Multiple Connections

```typescript
Redis.configure({
  default: 'main',
  connections: {
    main: { host: 'localhost', port: 6379 },
    cache: { host: 'cache.example.com', port: 6379, db: 1 }
  }
})

// Use specific connection
await Redis.connection('cache').set('cached-data', data)
```

### Client Type Selection

You can explicitly choose which Redis client implementation to use:

```typescript
// Use Bun.redis (default, recommended)
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'bun'  // 明確指定使用 Bun.redis
    }
  }
})

// Use ioredis
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'ioredis'  // 明確指定使用 ioredis
    }
  }
})

// Auto (default): 優先使用 Bun.redis，不可用時 fallback 到 ioredis
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'auto'  // 或省略此選項
    }
  }
})
```

## Roadmap

- [ ] Redis Cluster support
- [ ] Sentinel support
- [ ] Redis Streams
- [ ] Lua scripting

## License

MIT
