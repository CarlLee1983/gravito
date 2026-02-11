# @gravito/stasis 🧊

> Gravito 的高效能快取與狀態管理 Orbit。

`@gravito/stasis` 將複雜的快取邏輯封裝成優雅且強大的 API，讓你的應用在處理高併發與海量數據時依然游刃有餘。

---

## 📖 快速索引
*   [**技術架構深探**](./docs/architecture.zh-TW.md) — 了解混合式快取與預測機制的運作原理。
*   [**可觀察性與資源保護**](./docs/observability.zh-TW.md) — 如何防止 OOM 並監控快取效能。

---

## 🌟 核心能力
*   🚀 **統一 API**：無縫切換 Memory, Redis, File 等不同存儲驅動。
*   🏗️ **混合快取 (Tiered)**：結合本地 Memory 與分散式 Redis，實現極限讀取速度。
*   🔒 **分散式鎖**：基於原子操作的跨實例並發控制。
*   🚦 **流量節流**：內建基於快取基礎設施的 Rate Limiting。
*   🧠 **智慧預熱**：基於馬可夫鏈的存取路徑預測與自動讀取。

## 📦 安裝
```bash
bun add @gravito/stasis
```

## 🚀 5 分鐘快速上手

### 1. 配置 Orbit
```typescript
import { defineConfig } from '@gravito/core'
import { OrbitStasis } from '@gravito/stasis'

export default defineConfig({
  config: {
    cache: {
      default: 'tiered', // 預設使用分層快取
      stores: {
        local: { driver: 'memory', maxItems: 1000 },
        remote: { driver: 'redis', connection: 'default' },
        tiered: { driver: 'tiered', local: 'local', remote: 'remote' }
      }
    }
  },
  orbits: [new OrbitStasis()]
})
```

### 2. 資料存取範例
```typescript
const cache = core.container.make('cache');

// 💡 經典的「讀取或存儲」模式
const news = await cache.remember('news:today', 3600, () => {
  return await db.news.latest();
});
```

---

## 🛠️ 驅動程式一覽

| 驅動名稱 | 性質 | 適用場景 |
| :--- | :--- | :--- |
| **Memory** | L1 | 本地熱點、LRU 限制 |
| **Redis** | L2 | 分散式共用、原子性鎖 |
| **Tiered** | Hybrid | **推薦**：平衡效能與一致性 |
| **Predictive**| Smart | 具有明顯路徑規律的存取場景 |
| **File** | Persistent | 簡單的本地持久化 |

---

## 🤝 參與貢獻
我們歡迎任何優化建議！請參閱 [貢獻指南](../../CONTRIBUTING.md)。

MIT © Carl Lee
