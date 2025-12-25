# 路由 (Routing)

Gravito 路由器提供了優雅且流暢的 API，讓您可以將 URL 請求對應到特定的動作或控制器。

## 基礎路由

最基本的路由接受一個 URI 和一個閉包 (Closure)：

```typescript
// src/routes/index.ts
export default function(routes: Router) {
  routes.get('/greeting', (c) => {
    return c.text('Hello World');
  });
}
```

### 支援的路由方法

路由器允許您註冊支援任何 HTTP 動作的路由：

```typescript
routes.get(uri, handler);
routes.post(uri, handler);
routes.put(uri, handler);
routes.patch(uri, handler);
routes.delete(uri, handler);
```

## 路由參數

### 必填參數

有時您需要擷取 URL 中的片段。例如，擷取使用者的 ID：

```typescript
routes.get('/user/:id', (c) => {
  const id = c.req.param('id');
  return c.text(`User ID: ${id}`);
});
```

您可以根據需要定義多個參數：

```typescript
routes.get('/posts/:post/comments/:comment', (c) => {
  const { post, comment } = c.req.params();
  // ...
});
```

### 可選參數

若要定義可選參數，請在參數名稱後加上 `?`：

```typescript
routes.get('/user/:name?', (c) => {
  const name = c.req.param('name') || 'Guest';
  return c.text(`Hello ${name}`);
});
```

## 命名路由

命名路由讓您能方便地為特定路由產生 URL。您可以在定義路由後使用 `name` 方法鏈：

```typescript
routes.get('/user/profile', [UserController, 'show']).name('profile');
```

### 產生命名路由的 URL

一旦您為路由命名，就可以透過 `c.route()` 輔助函式來產生 URL：

```typescript
// 在控制器中
const url = c.route('profile');

// 帶有參數的路由
routes.get('/user/:id/profile', [UserController, 'show']).name('user.profile');

const urlWithParam = c.route('user.profile', { id: 1 }); 
// 輸出: /user/1/profile
```

## 路由群組 (Route Groups)

路由群組允許您跨多個路由共享路由屬性（如中間件或前綴），而不需要在每個路由上重複定義。

### 前綴 (Prefixes)

`prefix` 方法可用於為群組中的每個路由加上前綴 URI：

```typescript
routes.prefix('/admin').group((group) => {
  group.get('/users', [AdminController, 'users']); // 網址為 /admin/users
});
```

### 中間件 (Middleware)

若要為群組內的所有路由分配中間件，請使用 `middleware` 方法：

```typescript
routes.middleware(auth()).group((group) => {
  group.get('/dashboard', [DashboardController, 'index']);
  group.get('/profile', [UserController, 'profile']);
});
```

### 子網域路由 (Domain Routing)

Gravito 路由也可以處理子網域：

```typescript
routes.domain('api.example.com').group((group) => {
  group.get('/', () => {
    // 僅在 api.example.com 下觸發
  });
});
```

## 資源路由 (Resource Routes)

如果您遵循 RESTful 慣例，可以使用 `resource` 方法快速定義一組路由：

```typescript
routes.resource('photos', PhotoController);
```

這單行代碼將建立以下路由：

| 動作 | 方式 | URI | 方法名稱 | 路由名稱 |
| --- | --- | --- | --- | --- |
| GET | `index` | `/photos` | `index` | `photos.index` |
| GET | `create` | `/photos/create` | `create` | `photos.create` |
| POST | `store` | `/photos` | `store` | `photos.store` |
| GET | `show` | `/photos/:id` | `show` | `photos.show` |
| GET | `edit` | `/photos/:id/edit` | `edit` | `photos.edit` |
| PUT/PATCH | `update` | `/photos/:id` | `update` | `photos.update` |
| DELETE | `destroy` | `/photos/:id` | `destroy` | `photos.destroy` |

### 限定資源路由

您可以使用 `only` 或 `except` 來限定生成的動作：

```typescript
routes.resource('photos', PhotoController, {
  only: ['index', 'show']
});
```

## 路由模型綁定 (Route Model Binding)

Gravito 支援自動將模型實例注入到您的路由中。

### 顯式綁定

在您的路由定義中，使用 `model` 方法將參數與特定的模型類別關聯：

```typescript
import { User } from '../models/User';

export default function(routes: Router) {
  // 註冊綁定
  routes.model('user', User);

  routes.get('/users/:user', (c) => {
    // 自動從資料庫查找 User，找不到會拋出 404
    const user = c.get('routeModels').user;
    return c.json(user);
  });
}
```

## 回退路由 (Fallback Routes)

當沒有其他路由匹配傳入的請求時，您可以定義回退邏輯（通常在所有路由定義之後）：

```typescript
routes.get('*', (c) => {
  return c.notFound('客官，您走錯路了');
});
```