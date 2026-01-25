# @gravito/plasma

> Galaxy 架構的高效能 Redis Orbit。原生 Bun 支援、多連線管理與 Laravel 風格的 API。

[![npm version](https://img.shields.io/npm/v/@gravito/plasma.svg)](https://www.npmjs.com/package/@gravito/plasma)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/plasma** 是 Gravito 應用程式的標準 Redis 整合方案。基於 **Orbit** 模式構建，它提供了一個統一的抽象層，在利用 **Bun.redis** 實現極致效能的同時，提供受 Laravel 啟發、親切且流暢的 API。

## ✨ 特性

- 🪐 **Orbit 整合** - 無縫嵌入 PlanetCore 微核心。
- 🚀 **Bun 原生支援** - 預設使用 `Bun.redis`，實現零開銷的 TCP/Unix Socket 通訊。
- 🎯 **Laravel 風格 API** - 為所有 Redis 資料結構提供流暢、易用的介面。
- 🔌 **多連線管理** - 輕鬆管理多個具名 Redis 連線（如：`cache`、`session`、`queue`）。
- 🔄 **自動回退機制** - 若 `Bun.redis` 不可用（如在 Node.js 環境中），自動回退至 `ioredis`。
- 🔄 **管道支援 (Pipeline)** - 在單次往返中批量執行多條指令，提升吞吐量。
- 📡 **發佈/訂閱 (Pub/Sub)** - 簡單易用的即時訊息訂閱 API。
- 💓 **健康檢查** - 內建連線驗證與狀態監控功能。
- 🛡️ **可靠性** - 具備指數退避自動重連機制與優雅關閉服務功能。
- 🏢 **企業級設計** - 提供 Context 感知的中間件與 IoC 容器註冊支援。

## 📦 安裝

```bash
# 推薦用於 Bun 環境（無需額外依賴）
bun add @gravito/plasma

# 選配：添加 ioredis 作為 Node.js 環境的回退或特定功能支援
bun add @gravito/plasma ioredis
```

## 🚀 快速上手

### 1. 與 PlanetCore 整合

在應用程式啟動時將 Plasma 註冊為 Orbit：

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitPlasma } from '@gravito/plasma';

const core = new PlanetCore();

// 註冊 Orbit
core.addOrbit(new OrbitPlasma({
  connections: {
    default: { host: 'localhost', port: 6379 }
  },
  exposeAs: 'redis' // 預設為 'redis'
}));

await core.bootstrap();
```

### 2. 在路由中使用（中間件）

Plasma 會自動將 Redis 客戶端注入請求上下文（Context）：

```typescript
core.app.get('/cache-test', async (c) => {
  const redis = c.get('redis'); // 從上下文中解析
  
  await redis.set('greet', 'Hello Galaxy!', { ex: 60 });
  const val = await redis.get('greet');
  
  return c.json({ val });
});
```

### 3. 獨立使用 (Facade)

您也可以直接使用 `Redis` 門面 (Facade)：

```typescript
import { Redis } from '@gravito/plasma';

// 手動配置
Redis.configure({
  connections: {
    main: { host: 'localhost', port: 6379 }
  }
});

await Redis.set('foo', 'bar');
const bar = await Redis.get('foo');
```

## 🔧 多連線管理

定義多個連線並輕鬆切換：

```typescript
const plasma = new OrbitPlasma({
  default: 'cache',
  connections: {
    cache: { host: 'cache-server', port: 6379 },
    session: { host: 'session-server', port: 6379, db: 1 }
  }
});

// 在 Context 中使用
const cache = c.get('redis'); // 使用預設的 'cache'
const session = c.get('redis').connection('session');

await session.set('sid_123', data);
```

## 📖 API 參考

### 常用操作

```typescript
// 字串 (Strings)
await redis.set('key', 'value', { ex: 3600, nx: true });
const val = await redis.get('key');
await redis.incr('counter');

// 哈希 (Hashes)
await redis.hset('user:1', { name: 'John', age: 30 });
const user = await redis.hgetall('user:1');

// 列表 (Lists)
await redis.lpush('queue', 'task1');
const task = await redis.rpop('queue');

// 集合與有序集合 (Sets & Sorted Sets)
await redis.sadd('tags', 'news', 'tech');
await redis.zadd('ranks', { score: 10, member: 'alice' });
```

### 管道 (Pipeline)

群組指令以減少網路延遲：

```typescript
const [val1, val2, counter] = await redis.pipeline()
  .get('key1')
  .get('key2')
  .incr('counter')
  .exec();
```

### 發佈/訂閱 (Pub/Sub)

```typescript
// 訂閱
await redis.subscribe('events', (msg) => {
  console.log('收到訊息:', msg);
});

// 發佈
await redis.publish('events', '你好！');
```

## 🪝 Hooks 與事件

Plasma 透過標準 EventEmitter API 發送事件：

```typescript
const redis = Redis.connection();

redis.on('connect', () => console.log('Redis 已連線'));
redis.on('error', (err) => console.error('Redis 錯誤', err));
```

## 🔌 客戶端類型選擇

如有需要，可手動指定底層驅動：

```typescript
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'bun' // 強制使用 Bun.redis
      // clientType: 'ioredis' // 強制使用 ioredis
      // clientType: 'auto' // 預設：優先使用 Bun.redis，不可用時回退至 ioredis
    }
  }
});
```

## 🤝 貢獻

歡迎提交貢獻、問題與功能請求！
請隨時查看 [Issues 頁面](https://github.com/gravito-framework/gravito/issues).

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
