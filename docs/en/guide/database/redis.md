# Redis

Gravito provides a robust wrapper around Redis via the `@gravito/atlas` Redis driver. Redis can be used as a primary data store, a cache, or a message broker.

## Configuration

In your `config/database.ts` (or `.env`), you can define your Redis connection:

```typescript
export default {
  connections: {
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
    }
  }
}
```

## Basic Usage

You may interact with Redis by calling various methods on the `DB` or using the `Redis` facade.

```typescript
import { DB } from '@gravito/atlas';

const redis = DB.connection('redis');

// Basic set and get
await redis.set('user:profile:1', JSON.stringify({ name: 'Alice' }));
const profile = await redis.get('user:profile:1');
```

### Common Redis Commands

The Atlas Redis driver supports all standard Redis commands through its proxy:

```typescript
await redis.hset('user:1', 'name', 'Bob');
await redis.lpush('queue:tasks', 'email_verification');
await redis.expire('session:key', 3600); // 1 hour expiration
```

## Advanced Usage

### Pipelines (Batching Commands)

If you need to execute a large number of commands, you can use a pipeline to batch them together, reducing the number of network round-trips to the Redis server:

```typescript
const redis = DB.connection('redis');

const results = await redis.pipeline()
  .set('key1', 'val1')
  .set('key2', 'val2')
  .get('key1')
  .exec();
```

### Pub/Sub (Real-time Messaging)

Atlas supports Redis Pub/Sub, allowing you to build real-time notification systems:

**Subscriber:**
```typescript
const redis = DB.connection('redis');

await redis.subscribe('notifications', (message) => {
  console.log('Received:', message);
});
```

**Publisher:**
```typescript
const redis = DB.connection('redis');
await redis.publish('notifications', 'Hello Builders!');
```

## Atomic Operations

### Lua Scripting

For complex operations that must be atomic, you can execute Lua scripts directly on the Redis server:

```typescript
const script = `
  local current = redis.call('get', KEYS[1])
  if current == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

const result = await redis.eval(script, 1, 'my-key', 'expected-value');
```

## Related Modules

- **Cache**: Most Gravito applications use Redis via `@gravito/stasis` for distributed caching.
- **Queue**: Redis is the primary driver for `@gravito/horizon` (the queue system), ensuring high-performance job processing.
