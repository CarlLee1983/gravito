---
title: MVC 開發指南
description: 掌握 Gravito 的模型-視圖-控制器 (MVC) 模式，享受極致的開發體驗。
---

# MVC 開發指南

> Gravito 提供了受 Laravel 啟發的開發體驗，讓你能在 Bun 的高速環境下，輕鬆構建結構嚴謹的單體 (Monolith) 應用程式。

## Monolith 軌道 (Orbit)

要啟用進階的 MVC 功能（如基底控制器與資源路由），請確保已安裝並註冊了 `@gravito/monolith` 軌道：

```typescript
import { OrbitMonolith } from '@gravito/monolith'

await core.orbit(new OrbitMonolith())
```

---

## 控制器 (Controllers)

控制器將相關的請求處理邏輯分組到單個類別中。

### 產生控制器
使用 Gravito CLI 產生控制器：

```bash
# 基礎控制器
gravito make:controller UserController

# 資源控制器 (包含 index, store, show 等方法)
gravito make:controller ProductController --resource
```

### 撰寫邏輯
繼承自基底 `Controller` 類別以存取便捷方法：

```typescript
import { Controller } from '@gravito/monolith'

export class UserController extends Controller {
  async index() {
    // 透過 get 存取 Context 變數
    const db = this.get('db')
    
    // 回傳 JSON
    return this.json({
      users: await db.table('users').select()
    })
  }

  async show() {
    // 透過 this.request 存取路由參數
    const id = this.request.param('id')
    return this.text(`使用者 ID: ${id}`)
  }
}
```

---

## 路由 (Routing)

Gravito 支援顯式路由定義與自動化的資源映射。

### 資源路由 (Resource Routing)
只需一行程式碼即可為控制器註冊標準的 CRUD 路由：

```typescript
import { Route } from '@gravito/monolith'
import { UserController } from './controllers/UserController'

Route.resource(router, 'users', UserController)
```

這會自動建立以下映射：

| HTTP 動詞 | 路徑 | 動作 (Action) | 路由名稱 |
| :--- | :--- | :--- | :--- |
| GET | `/users` | index | `users.index` |
| GET | `/users/create` | create | `users.create` |
| POST | `/users` | store | `users.store` |
| GET | `/users/:id` | show | `users.show` |
| GET | `/users/:id/edit` | edit | `users.edit` |
| PUT | `/users/:id` | update | `users.update` |
| DELETE | `/users/:id` | destroy | `users.destroy` |

---

## 表單請求驗證 (Form Requests)

Form Requests 是封裝了驗證與授權邏輯的自定義請求類別。

### 產生驗證類別
```bash
gravito make:request StoreUserRequest
```

### 定義規則
使用 `TypeBox` 定義你的驗證規則。Gravito 會自動清洗你的數據（去除前後空格、將空字串轉換為 null）。

```typescript
import { FormRequest, Schema } from '@gravito/monolith'

export class StoreUserRequest extends FormRequest {
  schema() {
    return Schema.Object({
      email: Schema.String({ format: 'email' }),
      password: Schema.String({ minLength: 8 }),
      age: Schema.Number()
    })
  }

  authorize() {
    // 在此實作權限邏輯
    return true
  }
}
```

### 在路由中使用
將驗證類別作為中介軟體加入路由。如果驗證失敗，Gravito 會自動返回 **422 Unprocessable Entity** 回應，並包含格式化後的錯誤訊息。

```typescript
router.post('/users', StoreUserRequest.middleware(), UserController.call('store'))
```

---

## 模型 (Models - Atlas)

模型為資料庫互動提供了 Active Record 實作。

### 聯動產生
一次性產生模型、遷移檔案與控制器：

```bash
gravito make:model Post -a
```

---

## 下一步
參閱 [資料庫指南](./orm-usage.md) 了解更多關於 Atlas 模型與關聯的用法。
