---
title: Orbit DB
---

# Orbit DB

> 以 Gravito Orbit 形式提供資料庫整合。

套件：`@gravito/orbit-db`

此 Orbit 整合了 **Drizzle ORM**，提供標準化的資料庫連線、Context 注入以及 Hooks。

## 安裝

```bash
bun add @gravito/orbit-db drizzle-orm
```

## 用法

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/orbit-db';
import { drizzle } from 'drizzle-orm/bun-sqlite'; // 或您選擇的 driver
import { Database } from 'bun:sqlite';

const core = new PlanetCore();
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

// 初始化 DB Orbit
orbitDB(core, { 
    db,
    exposeAs: 'db' // 可透過 c.get('db') 存取
});

// 在路由中使用
core.app.get('/users', async (c) => {
    const db = c.get('db');
    // const users = await db.select().from(...);
    return c.json({ users: [] });
});
```

## Hooks

- `db:connected` - 當 DB Orbit 成功註冊時觸發。
