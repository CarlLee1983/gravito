---
title: 快速上手 (Quick Start)
description: 在 5 分鐘內完成您的第一個路由與控制器。
---

# 快速上手

> 已經安裝好 Gravito 了嗎？讓我們開始動手實作，體驗 Gravito 的開發魅力。

## 第一個路由 (Route)

在 Gravito 中，路由定義在 `src/routes/web.ts` (或 `api.ts`)。打開該檔案，您會看到一個直觀的鏈式 API。

```typescript
import { Route } from 'gravito-core'

// 加上一個簡單的閉包路由
Route.get('/hello', () => 'Hello Gravito!')
```

## 使用控制器 (Controller)

當邏輯變得複雜時，我們會將其移至控制器。使用 CLI 快速產生一個：

```bash
bun gravito make:controller UserController
```

然後在 `src/controllers/UserController.ts` 中定義方法：

```typescript
import { Context } from 'gravito-core'

export class UserController {
  async index(c: Context) {
    return c.json({ message: '這是來自控制器的回應' })
  }
}
```

最後回到 `src/routes/web.ts` 註冊它：

```typescript
import { UserController } from '../controllers/UserController'

Route.get('/users', [UserController, 'index'])
```

## 三種渲染路徑

Gravito 的強大之處在於它不強迫您選擇單一種開發模式。您可以根據頁面需求自由切換：

### A. 全端 SPA (Inertia.js + React/Vue)
適合複雜的後台或應用介面。
```ts
index(c: Context) {
  const inertia = c.get('inertia')
  return inertia.render('UserProfile', { name: 'John Doe' })
}
```

### B. 傳統 MPA (Template Engine)
適合 SEO 優先的產品、部落格或登錄頁面。
```ts
index(c: Context) {
  const view = c.get('view')
  return view.render('welcome', { title: '我的網站' })
}
```

### C. 輕量微服務 (API Only)
適合純 API 服務或行動裝置後端。
```ts
index(c: Context) {
  return c.json({ status: 'ok' })
}
```

## 資料庫與 Migrations

Gravito 內建了 **Atlas ORM**。您可以輕鬆定義遷移並執行：

```bash
# 執行所有待處理的遷移
bun gravito migrate

# 建立一個新的遷移
bun gravito make:migration create_posts_table
```

> 💡 **提示**：有關資料庫的詳細操作，請參閱 [ORM 使用指南](./orm-usage.md)。

## 進入互動式模式 (Tinker)

想快速測試一段程式碼或查詢資料庫？使用 `tinker` 進入 REPL：

```bash
bun gravito tinker
```

---

## 接下來
您已經掌握了 Gravito 的基本律動。下一步建議：
- 深入 [核心概念](./core-concepts.md) 了解底層架構。
- 探索 [路由系統](./routing.md) 的進階技巧。
