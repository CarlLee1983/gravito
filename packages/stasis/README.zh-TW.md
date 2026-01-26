# @gravito/stasis 🧊

> 高效能快取與速率限制 (Rate Limiting) Orbit，專為 Gravito 設計。

`@gravito/stasis` 為 Gravito 框架提供了一個強大且開發者友善的快取層。受 Laravel 快取系統啟發，它為多種存儲後端、分佈式鎖定以及整合式速率限制提供了統一的 API。

## 🌟 核心特性

- **🚀 統一快取 API**：在所有驅動程式中提供簡潔的 `get`、`put`、`remember` 與 `forever` 方法。
- **💾 多種存儲驅動**：原生支援 Memory、Redis、檔案 (File) 以及 Null 存儲。
- **🔒 分佈式鎖 (Distributed Locks)**：透過原子性的跨進程鎖定防止競態條件 (Race Conditions)。
- **⚡ 彈性快取 (SWR)**：支援 Stale-While-Revalidate 模式，在背景更新數據的同時快速響應請求。
- **🚦 整合式速率限制**：直接在快取基礎設施上構建的流量節流機制。
- **🏷️ 快取標籤 (Tagging)**：支援將相關項目分組，以便進行批量刪除（Memory 驅動支援）。
- **🪝 Hook 系統**：提供生命週期事件，用於監控快取命中 (Hit)、未命中 (Miss) 與寫入。

## 📦 安裝

```bash
bun add @gravito/stasis
```

## 🚀 快速上手

### 1. 註冊 Orbit

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitStasis } from '@gravito/stasis'

const config = defineConfig({
  config: {
    cache: {
      default: 'memory',
      stores: {
        memory: { driver: 'memory', maxItems: 5000 },
        redis: { driver: 'redis', connection: 'default' }
      }
    }
  },
  orbits: [new OrbitStasis()]
})

const core = await PlanetCore.boot(config)
```

### 2. 基礎快取操作

```typescript
const cache = core.container.make('cache')

// 簡單存儲
await cache.put('stats:total', 100, 3600) // 存儲 1 小時

// "Remember" 模式 (讀取或設置)
const users = await cache.remember('users:all', 300, async () => {
  return await db.users.findMany()
})
```

### 3. 分佈式鎖定

```typescript
const lock = cache.lock('process-invoice:123', 10)

if (await lock.get()) {
  try {
    // 執行關鍵任務...
  } finally {
    await lock.release()
  }
}
```

## 🚦 速率限制 (Rate Limiting)

輕鬆地使用您的快取後端來限制請求或操作的頻率。

```typescript
const limiter = cache.limiter()

if (await limiter.tooManyAttempts('login:127.0.0.1', 5)) {
  const seconds = await limiter.availableIn('login:127.0.0.1')
  throw new Error(`嘗試次數過多。請在 ${seconds} 秒後重試。`)
}

await limiter.hit('login:127.0.0.1', 60) // 60 秒後衰減
```

## 🛠️ 支援的驅動程式 (Drivers)

| 驅動名稱 | 適用場景 | 核心功能 |
|---|---|---|
| **Memory** | 本地開發與小型應用 | 極速、標籤支援、LRU |
| **Redis** | 分佈式生產環境 | 多節點共享、鎖定、持久化 |
| **File** | 簡單的持久化需求 | 無外部依賴 |
| **Null** | 測試或停用快取 | 不執行任何操作 |

## 🧩 API 參考

### `CacheManager`
- `cache.get(key, default?)`：讀取項目。
- `cache.put(key, value, ttl?)`：存儲項目。
- `cache.remember(key, ttl, callback)`：讀取或執行回調並存儲。
- `cache.flexible(key, ttl, stale, callback)`：Stale-While-Revalidate 模式。
- `cache.increment / decrement`：原子性的數值更新。
- `cache.tags(['tag1']).flush()`：按標籤清除快取。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
