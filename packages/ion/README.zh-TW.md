# 🛰️ Orbit Inertia (Ion)

> Gravito 的 Inertia.js 轉接器，用於建立現代化單體應用 (Modern Monolith)。支援 React、Vue 與 Svelte。

**Orbit Inertia** (@gravito/ion) 是一個高效能的轉接器，讓您能夠使用傳統的伺服器端路由與控制器來建立單頁應用程式 (SPA)。它扮演了 Gravito (Photon) 與前端框架之間的「膠水」，消除了開發獨立 REST 或 GraphQL API 的需求。

## ✨ 核心特性

- **🚀 現代化單體架構**：結合伺服器端開發的高效率與 SPA 框架的高互動性。
- **🛠️ 零 API 開發**：直接將資料從控制器傳遞到組件作為具備型別的 Props，不再需要管理 API 端點或手動處理序列化。
- **⚡ 高效能渲染**：內建針對組件與元資料 (Metadata) 的多層快取機制，確保毫秒級的極低開銷。
- **🛡️ 原生型別安全**：完整的 TypeScript 支援，透過 Generics 確保從伺服器到前端的端到端型別安全。
- **🔗 生態系整合**：與 `OrbitPrism` (模板引擎) 及 Gravito 的 Session/Auth 模組完美協作。
- **🔍 SEO 與 SSR 友善**：專為現代 Web 需求設計，支援伺服器端渲染 (SSR) 模式以優化搜尋引擎可見度。
- **🎨 多框架支援**：官方支援 **React**、**Vue** 與 **Svelte**。

## 📦 安裝

```bash
bun add @gravito/ion
```

## 🚀 快速上手

### 1. 註冊 Orbit

在應用程式啟動程式碼中：

```typescript
import { OrbitIon } from '@gravito/ion';
import { OrbitPrism } from '@gravito/prism'; // 渲染基礎 HTML 模板所需

const config = defineConfig({
  orbits: [OrbitPrism, OrbitIon],
});
```

### 2. 設定基礎模板

預設情況下，Ion 會尋找 `src/views/app.html`。使用 `{{{ page }}}` 佔位符來注入 Inertia 的資料：

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/static/assets/app.js"></script>
    <link rel="stylesheet" href="/static/assets/app.css">
</head>
<body>
    <div id="app" data-page='{{{ page }}}'></div>
</body>
</html>
```

### 3. 從控制器回傳回應

使用 Context 中提供的 `InertiaService`：

```typescript
import { Context } from '@gravito/photon';
import { InertiaService } from '@gravito/ion';

export class DashboardController {
  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService;
    
    return inertia.render('Dashboard/Index', {
      user: c.get('user'),
      stats: { activeOrders: 5 }
    });
  };
}
```

## 🔧 進階功能

### 共享 Props (Shared Props)
自動在每個 Inertia 回應中共享資料 (例如：當前用戶、快閃訊息)：

```typescript
inertia.share('auth', { user: 'Carl' });
```

### 局部重新載入 (Partial Reloads)
Ion 支援 Inertia 的局部重載機制，允許客戶端僅請求特定資料以節省頻寬。

### 手動序列化控制
自定義資料如何轉換為 JSON 傳遞給客戶端：

```typescript
inertia.render('ProductDetail', {
  product: product.toShortArray() // 顯式控制
});
```

## 🛡️ 效能與可靠性

### 基準測試 (內部測試)
| 操作 | 延遲 (Latency) |
|-----------|---------|
| 回應生成 | < 0.2ms |
| 模板注入 | < 0.1ms |
| Props 序列化 | 優化後的 LRU 快取 |

### 錯誤代碼
Ion 透過 `InertiaErrorCodes` 提供詳細的錯誤類型：
- `CONFIG_VIEW_SERVICE_MISSING`：請確保已載入 `OrbitPrism`。
- `SERIALIZATION_FAILED`：在 Props 中偵測到循環依賴。
- `TEMPLATE_RENDER_FAILED`：找不到或無法解析基礎 HTML 模板。

## 📝 授權

MIT © Carl Lee
