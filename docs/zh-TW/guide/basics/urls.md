---
title: URL 生成
description: 學習如何生成指向您的 Gravito 應用程式路由的 URL 連結，包括簽名 URL。
---

# URL 生成

Gravito 提供了多種輔助工具來生成指向應用程式內部路由的連結，確保您的內部路徑始終能保持靈活且可控。

## 基礎網址

您可以使用 `c.route()` (或在後端使用 `Router.url()`) 生成基礎連結：

```typescript
// 在控制器中
const url = c.route('home'); // 回傳 "/"
```

## 命名路由的 URL

這是推薦的做法。透過為路由命名，即使您修改了 URI，生成的連結也會自動更新。

```typescript
// 註冊路由
routes.get('/user/profile', [UserController, 'show']).name('user.profile');

// 生成連結
const url = c.route('user.profile'); 
```

### 傳遞參數

如果路由包含動態參數，請作為第二個參數傳遞：

```typescript
// 路由: /users/:id
const url = c.route('user.show', { id: 1 }); // /users/1
```

## 簽名 URL (Signed URLs)

簽名 URL 可讓您生成帶有雜湊簽名的「不可偽造」連結。這對於重設密碼或私有下載連結非常有用。

> **注意**：簽名 URL 需要正確配置 `APP_KEY`。

### 生成簽署連結

```typescript
const url = c.route('unsubscribe', { id: 1 }).signed();
// 輸出: /unsubscribe/1?signature=...
```

### 生成有時效性的簽署連結

```typescript
const url = c.route('download', { file: 'doc.pdf' }).temporarySigned(3600); // 1 小時後過期
```

### 驗證簽名

在接收請求的路由中，您可以使用中間件或直接檢查：

```typescript
routes.get('/unsubscribe/:id', (c) => {
  if (!c.req.hasValidSignature()) {
    return c.forbidden('此連結已失效或已被篡改');
  }
  // ...
}).name('unsubscribe');
```

## 靜態資源 URL

雖然您可以使用相對路徑，但使用 `asset()` 能確保連結在不同環境下都能正確導向：

```typescript
// 假設 public 目錄下有 logo.png
const url = c.asset('logo.png'); // /logo.png
```

---

## 接下來
閱讀 [路由系統](./routing.md) 了解如何定義與命名您的路由。
