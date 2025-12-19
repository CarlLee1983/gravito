---
title: 路由與控制器
description: 以優雅且精確的方式處理每一位使用者的請求。
---

# 🛣 路由與控制器 (Routing & Controllers)

Gravito 結合了 **Hono** 的速度與 **MVC** (Model-View-Controller) 的架構化開發。這種設計確保了當您的應用程式規模擴大時，程式碼依然保持井然有序。

## 🚦 路由器 (The Router)

路由定義在 `src/routes/index.ts`。Gravito 提供了一套流暢的 API 來將網址映射到特定的動作。

### 基礎路由

```typescript
// src/routes/index.ts
import { HomeController } from '../controllers/HomeController'

export default function(routes: Router) {
  // 簡單的匿名函式
  routes.get('/hello', (c) => c.text('Hello World'))

  // 映射到控制器 (Controller)
  routes.get('/', [HomeController, 'index'])
}
```

### 路由分組 (Route Groups)
您可以將相關的路由編組，以便統一套用前綴 (Prefix) 或中間件 (Middleware)。

```typescript
routes.group({ prefix: '/api' }, (group) => {
  group.get('/users', [UserController, 'list'])
  group.get('/posts', [PostController, 'list'])
})
```

---

## 🧠 控制器 (Controllers)

控制器是應用程式的「大腦」。與其將所有邏輯寫在一個巨大的路由檔案中，我們將它們封裝在類別 (Class) 裡。

### 控制器結構剖析

```typescript
// src/controllers/UserController.ts
import { Context } from 'hono'

export class UserController {
  /**
   * 取得使用者列表
   * @param c Hono Context
   */
  async list(c: Context) {
    // 1. 從容器中取得服務
    const userService = c.get('userService')
    
    // 2. 執行業務邏輯
    const users = await userService.all()

    // 3. 回傳回應
    return c.json({ data: users })
  }
}
```

### 存取服務 (Accessing Services)
Hono 的 `Context` 物件是您進入 Gravito 生態系統的入口。使用 `c.get()` 來存取各種 Orbits 與服務：
- `c.get('inertia')`：Inertia 全端橋接器。
- `c.get('view')`：樣板引擎。
- `c.get('seo')`：SEO 標籤管理器。

---

## 📦 處理回應 (Handling Responses)

控制器的每個方法都必須回傳一個標準的 `Response`。透過 Gravito/Hono，這變得非常簡單：

| 回傳類型 | 方法 | 描述 |
|------|--------|-------------|
| **JSON** | `c.json(data)` | 適用於 API 開發。 |
| **HTML** | `c.html(string)` | 回傳原始 HTML 字串。 |
| **Inertia** | `inertia.render(name, props)` | 回傳全端 React 視圖頁面。 |
| **View** | `view.render(name, data)` | 回傳後端渲染的樣板頁面。 |
| **重新導向**| `c.redirect(url)` | 將使用者導向其他網址。 |

---

## 🛡 中間件 (Middleware)

中間件允許您在請求到達控制器之前進行攔截（例如：日誌記錄或身分驗證）。

```typescript
// 為整個路由群組套用中間件
routes.group({ middleware: [logger()] }, (group) => {
  group.get('/dashboard', [DashboardController, 'index'])
})
```

> **下一步**：在 [Inertia 全端開發指南](/zh/docs/guide/inertia-react) 中學習如何橋接後端邏輯與現代前端介面。
