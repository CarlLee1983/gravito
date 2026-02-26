---
title: 中間件 (Middleware)
description: 掌握 Gravito Galaxy 的請求生命週期過濾器。學習如何定義、註冊並在領域衛星 (Satellites) 中靈活運用中間件。
---

# 🛡️ 中間件 (Middleware)

中間件提供了一種強大的機制來檢查、過濾並增強進入應用程式的 HTTP 請求。它們在請求到達路由處理器 (Handler) **之前**執行，並在回應返回給客戶端 **之前**執行清理邏輯。

在 Gravito v1.6+ 的銀河架構中，中間件不僅僅是過濾器，更是跨衛星 (Satellite) 通訊與資源注入的核心。

---

## 🏗️ 定義中間件

中間件是一個非同步函式，接收一個 `GravitoContext` (上下文) 和一個 `GravitoNext` (下一個處理程序)。

```typescript
import { GravitoMiddleware } from '@gravito/core';

export const requestLogger: GravitoMiddleware = async (c, next) => {
  const start = Date.now();
  
  // 1. 請求前邏輯 (Before)
  console.log(`[REQUEST] ${c.req.method} ${c.req.path}`);

  // 2. 傳遞給下一個中間件或路由處理器
  await next();
  
  // 3. 請求後邏輯 (After)
  const ms = Date.now() - start;
  console.log(`[RESPONSE] ${c.req.path} - ${ms}ms`);
};
```

---

## 🚀 在領域衛星中應用 (MDD 模式)

在最新的 **清單驅動開發 (MDD)** 模式下，我們建議在衛星的 `manifest.json` 中宣告式地使用中間件。

### 1. 註冊中間件識別碼
首先，在 Galaxy Host (`src/bootstrap.ts`) 中向 **Xenon** 註冊具名的中間件：

```typescript
// src/bootstrap.ts
const setLocale = (locale: string) => async (c, next) => {
  c.set('locale', locale);
  await next();
};

xenon.registerMiddlewares({
  'setLocale:zh': setLocale('zh'),
  'setLocale:en': setLocale('en'),
});
```

### 2. 在 Manifest 中引用
接著，在衛星的 `manifest.json` 中直接使用這些標籤：

```json
{
  "name": "SiteDocs",
  "routes": [
    { 
      "path": "/zh/docs/*", 
      "method": "GET", 
      "handler": "DocsController@show", 
      "middleware": ["setLocale:zh"] 
    }
  ]
}
```

---

## 🛡️ 實戰應用：守護者容錯層 (Resilience)

透過 `@gravito/resilience` 提供的中介層，您可以為特定的 API 加上 **熔斷器 (Circuit Breaker)** 保護：

```typescript
import { resilience } from '@gravito/resilience';

// 只有 API 請求受到熔斷器保護，避免資料庫崩潰拖垮整個衛星
router.prefix('/api').middleware(resilience()).group((api) => {
  api.get('/stats', [ApiController, 'stats']);
});
```

---

## 📥 資源注入與上下文共享

中間件最常見的用途是將物件注入到 `Context` 中，讓後續的處理程序可以使用。

```typescript
// 權限驗證中間件
export const authGuard: GravitoMiddleware = async (c, next) => {
  const token = c.req.header('Authorization');
  const user = await verifyToken(token);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 將用戶資訊注入上下文
  c.set('user', user);
  await next();
};

// 在控制器中使用
export class ProfileController {
  show = async (c) => {
    const user = c.get('user'); // 這裡可以取得中間件注入的 user
    return c.json(user);
  }
}
```

---

## 🌍 全域中間件

如果您希望某個邏輯在 **所有** 請求（包含靜態資源）之前執行，請在 `adapter` 層級註冊：

```typescript
// src/bootstrap.ts
core.adapter.useGlobal(async (c, next) => {
  c.header('X-Powered-By', 'Gravito Galaxy');
  await next();
});
```

---

## 🔗 內建常用中間件

Gravito 生態系統提供了一系列開箱即用的中間件：

| 標籤 | 套件 | 功能說明 |
| :--- | :--- | :--- |
| `rateLimit` | `@gravito/photon` | 智慧速率限制，支援 IP 與 UserID |
| `jwt` | `@gravito/photon` | 高效能 JWT 簽名與驗證 |
| `cors` | `@gravito/photon` | 跨域資源共享管理 |
| `cache` | `@gravito/stasis` | 響應層級自動快取 |
| `shield` | `@gravito/fortify` | 進階 XSS 與 SQL 注入防護 |

---

## 💡 最佳實踐

1.  **順序很重要**：中間件的執行順序與註冊順序一致。通常將 `logger` 放在最前，`auth` 放在中間，`resilience` 放在業務邏輯前。
2.  **避免阻塞**：中間件應保持輕量。耗時的操作（如發送郵件）應交由 `@gravito/stream` 非同步處理。
3.  **錯誤處理**：如果中間件內發生錯誤，Gravito 會自動捕獲並引導至 `ErrorHandler`，您也可以直接在中間件中返回 `c.json()` 等響應來終止請求。
