# Redis

Gravito 透過 `@gravito/atlas` 的 Redis 驅動程式提供了一個強大的 Redis 包裝器。Redis 可以被用作主資料儲存、快取或訊息代理。

## 配置

在您的 `config/database.ts` (或 `.env`) 中，您可以定義您的 Redis 連線：

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

## 基礎用法

您可以透過調用 `DB` 上的各種方法或使用 `Redis` 門面來與 Redis 交互。

```typescript
import { DB } from '@gravito/atlas';

const redis = DB.connection('redis');

// 基礎 set 與 get
await redis.set('user:profile:1', JSON.stringify({ name: 'Alice' }));
const profile = await redis.get('user:profile:1');
```

### 常見 Redis 命令

Atlas Redis 驅動程式透過其代理支援所有標準 Redis 命令：

```typescript
await redis.hset('user:1', 'name', 'Bob');
await redis.lpush('queue:tasks', 'email_verification');
await redis.expire('session:key', 3600); // 1 小時過期時間
```

## 進階用法

### 管道 (Pipelines / Batching)

如果您需要執行大量命令，可以使用管道將它們批次處理，從而減少與 Redis 伺服器間的網路延遲：

```typescript
const redis = DB.connection('redis');

const results = await redis.pipeline()
  .set('key1', 'val1')
  .set('key2', 'val2')
  .get('key1')
  .exec();
```

### 發布 / 訂閱 (Pub/Sub)

Atlas 支援 Redis Pub/Sub，讓您可以構建即時通知系統：

**訂閱者 (Subscriber):**
```typescript
const redis = DB.connection('redis');

await redis.subscribe('notifications', (message) => {
  console.log('收到訊息:', message);
});
```

**發布者 (Publisher):**
```typescript
const redis = DB.connection('redis');
await redis.publish('notifications', 'Hello Builders!');
```

## 原子操作 (Atomic Operations)

### Lua 腳本

對於必須保證原子性的複雜操作，您可以直接在 Redis 伺服器上執行 Lua 腳本：

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

## 關聯模組

- **Cache (快取)**: 大多數 Gravito 應用程式透過 `@gravito/stasis` 使用 Redis 進行分散式快取。
- **Queue (隊列)**: Redis 是 `@gravito/horizon` (隊列系統) 的主要驅動程式，確保高效能的任務處理。
