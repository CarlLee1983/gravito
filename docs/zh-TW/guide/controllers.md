# 控制器 (Controllers)

與其將所有的請求處理邏輯都定義在路由檔案中，您可以使用控制器類別來組織這些行為。

## 基礎控制器

控制器存放在 `src/controllers` 目錄中。一個基礎控制器的結構如下：

```typescript
import { GravitoContext as Context } from 'gravito-core';

export class UserController {
  /**
   * 顯示給定使用者的個人資料
   */
  async show(c: Context) {
    const id = c.req.param('id');
    const user = await User.find(id);

    return c.json({ user });
  }
}
```

### 控制器與依賴注入

Gravito 控制器可以透過 `Context` 存取應用程式容器中的任何服務：

```typescript
async list({ userService }: Context) {
  // 透過 Proxy 自動注入 userService
  const users = await userService.all();
  return c.json(users);
}
```

## 單一動作控制器 (Single Action Controllers)

如果您想定義一個只處理單一動作的控制器，可以使用 `__invoke` 方法（或任何您喜歡的名稱，並在路由中指定）：

```typescript
export class ProvisionServerController {
  async handle(c: Context) {
    // 處理邏輯
  }
}

// 路由定義
routes.get('/server/provision', [ProvisionServerController, 'handle']);
```

## 資源控制器 (Resource Controllers)

Gravito 的資源路由讓您可以輕鬆建立處理 RESTful 動作的控制器。配合 `routes.resource()` 使用，您的控制器應該包含對應的方法：

```typescript
export class PhotoController {
  // GET /photos
  async index(c: Context) { /* ... */ }

  // GET /photos/create
  async create(c: Context) { /* ... */ }

  // POST /photos
  async store(c: Context) { /* ... */ }

  // GET /photos/:id
  async show(c: Context) { /* ... */ }

  // GET /photos/:id/edit
  async edit(c: Context) { /* ... */ }

  // PUT /photos/:id
  async update(c: Context) { /* ... */ }

  // DELETE /photos/:id
  async destroy(c: Context) { /* ... */ }
}
```

## 控制器中間件

雖然您可以在路由檔案中指定中間件，但在某些情況下，您可能希望在控制器內定義中間件邏輯（目前 Gravito 建議主要在路由層定義中間件，以保持控制器純粹）。
