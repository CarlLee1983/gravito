# Bun 原生 Redis 實現 - 開發日誌

## 概述

本分支實現了基於 `Bun.redis` 的原生 Redis 客戶端，完全兼容現有的 `RedisClientContract` 接口，無需修改現有代碼即可使用。

## 實現狀態

✅ **已完成**

### 核心功能
- [x] 連接管理（connect/disconnect/isConnected/ping）
- [x] String 操作（get/set/del/exists/incr/decr/mget/mset 等）
- [x] Hash 操作（hget/hset/hgetall/hdel/hmget/hmset 等）
- [x] List 操作（lpush/rpush/lpop/rpop/lrange/llen 等）
- [x] Set 操作（sadd/srem/smembers/sismember/scard 等）
- [x] Sorted Set 操作（zadd/zrem/zrange/zrank/zscore 等）
- [x] TTL 操作（expire/ttl/pttl/persist 等）
- [x] Key 操作（keys/scan/type/rename 等）
- [x] Server 操作（info/flushdb/flushall/dbsize）
- [x] Pipeline 支持
- [x] Pub/Sub 支持（使用專用連接）

### 整合功能
- [x] 整合到 `RedisManager`
- [x] 自動選擇機制（優先 Bun.redis，fallback 到 ioredis）
- [x] 類型定義完善
- [x] 類型檢查通過

## 技術細節

### API 差異處理

1. **EXISTS 返回值**
   - Bun.redis 返回 `boolean`
   - ioredis 返回 `number` (0 或 1)
   - 處理：自動轉換 boolean 為 number

2. **SET 選項格式**
   - Bun.redis: `set(key, value, { ex: 60, nx: true })`
   - ioredis: `SET key value EX 60 NX`
   - 處理：統一轉換為 Bun.redis 格式

3. **Pipeline**
   - Bun.redis: 自動 pipelining 或使用 `send()`
   - ioredis: 顯式 `pipeline().set().get().exec()`
   - 處理：實現了 `BunRedisPipeline` 類，保持相同 API

4. **Pub/Sub**
   - Bun.redis: 訂閱後需要專用連接
   - ioredis: 可在同一連接上使用
   - 處理：為訂閱創建獨立的 `subscriber` 連接

### 類型安全

- 所有 `send()` 命令的返回值都進行了類型檢查和轉換
- 處理了 `unknown` 類型到具體類型的轉換
- 兼容 Bun.redis 的 `void` 返回類型（`close()` 方法）

## 使用方式

### 自動選擇（推薦）

```typescript
import { Redis } from '@gravito/plasma'

Redis.configure({
  default: 'main',
  connections: {
    main: { host: 'localhost', port: 6379 }
    // clientType 默認為 'auto'，會自動選擇 Bun.redis
  }
})

await Redis.connect()
// 自動使用 Bun.redis（如果可用）
```

### 明確指定

```typescript
// 強制使用 Bun.redis
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'bun'
    }
  }
})

// 強制使用 ioredis
Redis.configure({
  connections: {
    main: { 
      host: 'localhost', 
      port: 6379,
      clientType: 'ioredis'
    }
  }
})
```

## 文件結構

```
packages/plasma/
├── src/
│   ├── clients/
│   │   ├── BunRedisClient.ts    # Bun.redis 實現
│   │   └── index.ts
│   ├── RedisClient.ts           # ioredis 實現（現有）
│   ├── RedisManager.ts          # 管理器（已更新）
│   └── types/
│       └── index.ts             # 類型定義（已更新）
├── IMPLEMENTATION_PLAN.md        # 實現規劃
└── CHANGELOG_BUN_NATIVE.md      # 本文件
```

## 後續工作

- [ ] 性能測試與對比（Bun.redis vs ioredis）
- [ ] 編寫單元測試
- [ ] 編寫整合測試
- [ ] 更新文檔中的示例
- [ ] 考慮移除 ioredis 作為 peer dependency（如果完全遷移到 Bun.redis）

## 注意事項

1. **Bun.redis 要求**: 需要 Bun 運行時環境，且 Redis 服務器版本 >= 7.2
2. **向後兼容**: 現有使用 ioredis 的代碼無需修改
3. **自動 Fallback**: 如果 Bun.redis 不可用，會自動使用 ioredis
