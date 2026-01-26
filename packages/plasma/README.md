# @gravito/plasma

> High-performance Redis Orbit for Galaxy Architecture. Bun-native, multi-connection, and Laravel-style API.

[![npm version](https://img.shields.io/npm/v/@gravito/plasma.svg)](https://www.npmjs.com/package/@gravito/plasma)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/plasma** is the standard Redis integration for Gravito applications. Built on the **Orbit** pattern, it provides a unified abstraction layer that leverages **Bun.redis** for maximum performance while offering a familiar, fluent API inspired by Laravel.

## ✨ Features

- 🪐 **Orbit Integration** - Seamlessly plugs into the PlanetCore micro-kernel.
- 🚀 **Bun Native** - Uses `Bun.redis` by default for zero-overhead TCP/Unix socket communication.
- 🎯 **Laravel-style API** - Familiar fluent interface for all Redis data structures.
- 🔌 **Multi-connection** - Manage multiple named Redis connections (e.g., `cache`, `session`, `queue`).
- 🔄 **Auto Fallback** - Automatically falls back to `ioredis` if `Bun.redis` is unavailable (e.g., in Node.js environments).
- 🔄 **Pipeline Support** - Batch multiple commands in a single round-trip for higher throughput.
- 📡 **Pub/Sub** - Real-time messaging with a simple subscription API.
- 💓 **Health Check** - Built-in connection verification and status monitoring.
- 🛡️ **Reliability** - Automatic reconnection with exponential backoff and graceful shutdown.
- 🏢 **Enterprise Ready** - Context-aware middleware and IoC container registration.

## 📦 Installation

```bash
# Recommended for Bun environments (no external dependencies needed)
bun add @gravito/plasma

# Optional: Add ioredis as a fallback for Node.js or specific features
bun add @gravito/plasma ioredis
```

## 🚀 Quick Start

### 1. Initialize with PlanetCore

Register Plasma as an Orbit in your application bootstrap:

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitPlasma } from '@gravito/plasma';

const core = new PlanetCore();

// Register the orbit
core.addOrbit(new OrbitPlasma({
  connections: {
    default: { host: 'localhost', port: 6379 }
  },
  exposeAs: 'redis' // Default is 'redis'
}));

await core.bootstrap();
```

### 2. Use in Routes (Middleware)

Plasma automatically injects the Redis client into the request context:

```typescript
core.app.get('/cache-test', async (c) => {
  const redis = c.get('redis'); // Resolved from context
  
  await redis.set('greet', 'Hello Galaxy!', { ex: 60 });
  const val = await redis.get('greet');
  
  return c.json({ val });
});
```

### 3. Standalone Usage (Facade)

You can also use the `Redis` facade directly:

```typescript
import { Redis } from '@gravito/plasma';

// Configure manually
Redis.configure({
  connections: {
    main: { host: 'localhost', port: 6379 }
  }
});

await Redis.set('foo', 'bar');
const bar = await Redis.get('foo');
```

## 🔧 Multi-Connection

Define multiple connections and switch between them easily:

```typescript
const plasma = new OrbitPlasma({
  default: 'cache',
  connections: {
    cache: { host: 'cache-server', port: 6379 },
    session: { host: 'session-server', port: 6379, db: 1 }
  }
});

// Using context
const cache = c.get('redis'); // uses default 'cache'
const session = c.get('redis').connection('session');

await session.set('sid_123', data);
```

## 📖 API Reference

### Common Operations

```typescript
// Strings
await redis.set('key', 'value', { ex: 3600, nx: true });
const val = await redis.get('key');
await redis.incr('counter');

// Hashes
await redis.hset('user:1', { name: 'John', age: 30 });
const user = await redis.hgetall('user:1');

// Lists
await redis.lpush('queue', 'task1');
const task = await redis.rpop('queue');

// Sets & Sorted Sets
await redis.sadd('tags', 'news', 'tech');
await redis.zadd('ranks', { score: 10, member: 'alice' });
```

### Pipeline

Group commands to reduce network latency:

```typescript
const [val1, val2, counter] = await redis.pipeline()
  .get('key1')
  .get('key2')
  .incr('counter')
  .exec();
```

### Pub/Sub

```typescript
// Subscribe
await redis.subscribe('events', (msg) => {
  console.log('Received:', msg);
});

// Publish
await redis.publish('events', 'Hello!');
```

## 🪝 Hooks & Events

Plasma emits events via standard EventEmitter API:

```typescript
const redis = Redis.connection();

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error', err));
```

## 🔌 Client Type Selection

Manually specify the underlying driver if needed:

```typescript
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'bun' // Force Bun.redis
      // clientType: 'ioredis' // Force ioredis
      // clientType: 'auto' // Default: Bun.redis -> ioredis fallback
    }
  }
});
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/gravito-framework/gravito/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
