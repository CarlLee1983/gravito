---
title: 基礎路由
description: 掌握 Gravito 路由器。學習基礎路由、參數傳遞、命名路由以及透過 manifest.json 實現的宣告式路由。
---

# 🚦 路由 (Routing)

Gravito 路由器提供了優雅且流暢的 API，將 URL 請求對應到特定的動作或控制器。它建立在 Photon 的 O(1) Radix Tree 引擎之上，具備極致的性能表現。

---

## 🏗️ 基礎路由

最基本的路由接受一個 URI 和一個閉包 (Closure) 或控制器方法：

```typescript
// 簡單閉包
router.get('/greeting', (c) => {
  return c.text('Hello World');
});

// 控制器方法
router.get('/profile', [UserController, 'show']);
```

### 支援的方法

路由器支援所有標準 HTTP 謂詞：

```typescript
router.get(uri, handler);
router.post(uri, handler);
router.put(uri, handler);
router.patch(uri, handler);
router.delete(uri, handler);
router.options(uri, handler);
```

---

## 📄 宣告式路由 (Manifest-Driven)

在 **銀河架構 (Galaxy Architecture)** 中，我們建議在衛星 (Satellite) 的 `manifest.json` 中宣告路由。這有利於零配置發現與並行加載。

```json
{
  "name": "UserSatellite",
  "routes": [
    { 
      "path": "/profile", 
      "method": "GET", 
      "handler": "UserController@show",
      "middleware": ["auth"]
    },
    { 
      "path": "/settings", 
      "method": "POST", 
      "handler": "UserController@update" 
    }
  ]
}
```

> **注意**：要使用 `"UserController@show"` 這種字串處理器，您必須在宿主 (Host) 的 **Xenon** 註冊表中註冊對應的類別或函式。

---

## 🔗 路由參數

### 必填參數
使用 `:` 前綴來擷取 URL 片段：

```typescript
router.get('/user/:id', (c) => {
  const id = c.req.param('id');
  return c.text(`使用者 ID: ${id}`);
});
```

### 可選參數
在參數名稱後加上 `?`：

```typescript
router.get('/user/:name?', (c) => {
  const name = c.req.param('name') || '訪客';
  return c.text(`哈囉 ${name}`);
});
```

---

## 🏷️ 命名路由

命名路由讓您能方便地產生 URL。您可以在定義路由時使用 `name` 方法：

```typescript
router.get('/user/profile', [UserController, 'show']).name('profile');
```

### 產生 URL
使用 `c.route()` 輔助函式來為命名路由產生 URL：

```typescript
// 基礎路由
const url = c.route('profile');

// 帶參數的路由
router.get('/user/:id', [UserController, 'show']).name('user.show');
const urlWithParam = c.route('user.show', { id: 42 }); // /user/42
```

---

## 👥 路由群組

群組允許您跨多個路由共享屬性（如中間件或前綴）。

```typescript
router.prefix('/admin').middleware(auth()).group((admin) => {
  admin.get('/dashboard', [AdminController, 'index']);
  admin.get('/users', [AdminController, 'users']);
});
```

---

## 📦 資源路由 (Resource Routes)

Gravito 透過 `resource` 方法遵循 RESTful 慣例：

```typescript
router.resource('photos', PhotoController);
```

| 謂詞 | 動作 | URI | 方法名稱 |
| --- | --- | --- | --- |
| GET | `index` | `/photos` | `index` |
| POST | `store` | `/photos` | `store` |
| GET | `show` | `/photos/:id` | `show` |
| PUT | `update` | `/photos/:id` | `update` |
| DELETE | `destroy` | `/photos/:id` | `destroy` |

---

## 🛡️ 簽名路由 (Signed URLs)

產生帶有加密簽名的 URL，防止連結被竄改：

```typescript
// 產生
const url = c.route('unsubscribe', { user: 1 }).signed();

// 驗證
router.get('/unsubscribe/:user', (c) => {
  if (!c.req.hasValidSignature()) {
    return c.forbidden();
  }
}).name('unsubscribe');
```

---

## 🔗 延伸閱讀
- 🛡️ [中間件指南](./middleware.md)
- 📥 [Request 解析](./requests.md)
- 📤 [Response 構建](./responses.md)
