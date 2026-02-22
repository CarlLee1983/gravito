# Laravel 開發者快速上手 - Gravito 框架指南

## 概述

本指南為熟悉 Laravel 的開發者提供快速上手 Gravito 框架的方法。Gravito 採用 TypeScript + Bun，提供與 Laravel 相似的開發體驗。

---

## 一、概念對比

| 概念 | Laravel | Gravito | 說明 |
|------|---------|---------|------|
| 應用層 | `app/` | `src/` | 源代碼目錄 |
| 路由 | `routes/web.php` | `src/routes.ts` | 集中路由定義 |
| 控制器 | `app/Http/Controllers/` | `src/Http/Controllers/` (MVC) | 請求處理器 |
| 模型 | `app/Models/` | `src/Models/` | 數據模型 (ORM) |
| 中間件 | `app/Http/Middleware/` | `src/Http/Middleware/` | 請求/響應管道 |
| 驗證 | Validation Rules | Zod Schema | 輸入驗證 |
| ORM | Eloquent | Atlas | 數據庫交互 |
| 緩存 | Cache Facade | Stasis | 緩存層 |
| 認證 | Auth Guard | Sentinel | 用戶認證 |
| 事件 | Events | Signal | 事件總線 |
| 遷移 | Migrations | Atlas Migrations | 數據庫版本管理 |

---

## 二、常見任務對照

### 1. 創建項目

**Laravel:**
```bash
composer create-project laravel/laravel my-app
```

**Gravito:**
```bash
bun run create my-app --architecture mvc --profile core
```

### 2. 定義路由

**Laravel (routes/web.php):**
```php
Route::get('/', [HomeController::class, 'index']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth')->get('/dashboard', [HomeController::class, 'dashboard']);
```

**Gravito (src/routes.ts):**
```typescript
export async function registerRoutes(core: PlanetCore) {
  core.get('/', (ctx) => new HomeController().index(ctx))
  core.post('/login', (ctx) => new AuthController().login(ctx))
  core.get('/dashboard', (ctx) => new HomeController().dashboard(ctx), [AuthMiddleware])
}
```

### 3. 創建控制器

**Laravel:**
```bash
php artisan make:controller UserController --resource
```

**Gravito:**
```bash
bun make:controller UserController --resource
```

生成的控制器結構相似，包含 index、show、create、store、edit、update、destroy 方法。

### 4. 創建模型

**Laravel:**
```bash
php artisan make:model User --migration
```

**Gravito:**
```bash
bun make:model User --migration
```

### 5. 表單驗證

**Laravel (FormRequest):**
```php
class LoginRequest extends FormRequest {
    public function rules() {
        return [
            'email' => 'required|email',
            'password' => 'required|min:6'
        ];
    }
}
```

**Gravito (Zod):**
```typescript
import { z } from 'zod'

export const LoginRequest = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

// 使用
const data = LoginRequest.parse(await ctx.request.json())
```

### 6. ORM 查詢

**Laravel (Eloquent):**
```php
$users = User::where('email', 'like', '%@example.com%')->get();
$user = User::find(1);
$user->update(['name' => 'John']);
```

**Gravito (Atlas):**
```typescript
const users = await User.where('email', 'like', '%@example.com%').get()
const user = await User.find(1)
await user.update({ name: 'John' })
```

### 7. 認證

**Laravel:**
```php
Auth::login($user);
Auth::logout();
Auth::user();
```

**Gravito (Sentinel):**
```typescript
await ctx.auth.login(user)
await ctx.auth.logout()
ctx.auth.user
```

### 8. 緩存

**Laravel:**
```php
Cache::put('key', $value, now()->addHours(1));
Cache::get('key');
```

**Gravito (Stasis):**
```typescript
await ctx.cache.set('key', value, 3600)
await ctx.cache.get('key')
```

---

## 三、第一個 CRUD 應用（15 分鐘）

### 步驟 1：創建項目

```bash
bun run create blog --architecture mvc --profile core
cd blog
bun install
```

### 步驟 2：創建 Post 模型與遷移

```bash
bun make:model Post --migration
```

編輯 `database/migrations/index.ts`，添加 posts 表：

```typescript
schema.createTable('posts', (table) => {
  table.increments('id')
  table.string('title')
  table.text('content')
  table.timestamps()
})
```

### 步驟 3：生成 Post 控制器

```bash
bun make:controller PostController --resource
```

編輯 `src/Http/Controllers/PostController.ts`：

```typescript
import { GravitoContext } from '@gravito/core'
import { Post } from '../../Models/Post'

export class PostController {
  async index(ctx: GravitoContext) {
    const posts = await Post.all()
    return ctx.json({ data: posts })
  }

  async store(ctx: GravitoContext) {
    const data = await ctx.request.json()
    const post = await Post.create(data)
    return ctx.json({ data: post }, 201)
  }

  async show(ctx: GravitoContext) {
    const post = await Post.find(ctx.request.params.id)
    return ctx.json({ data: post })
  }

  async update(ctx: GravitoContext) {
    const post = await Post.find(ctx.request.params.id)
    await post.update(await ctx.request.json())
    return ctx.json({ data: post })
  }

  async destroy(ctx: GravitoContext) {
    await Post.find(ctx.request.params.id).then(p => p.delete())
    return ctx.json({ message: 'Post deleted' })
  }
}
```

### 步驟 4：定義路由

編輯 `src/routes.ts`：

```typescript
export async function registerRoutes(core: PlanetCore) {
  core.get('/api/posts', (ctx) => new PostController().index(ctx))
  core.post('/api/posts', (ctx) => new PostController().store(ctx))
  core.get('/api/posts/:id', (ctx) => new PostController().show(ctx))
  core.put('/api/posts/:id', (ctx) => new PostController().update(ctx))
  core.delete('/api/posts/:id', (ctx) => new PostController().destroy(ctx))
}
```

### 步驟 5：運行應用

```bash
bun run dev
```

訪問 `http://localhost:3000/api/posts` 測試 API。

---

## 四、常見問題

### Q: 為什麼使用 TypeScript 而不是 PHP？
A: TypeScript 提供更強的類型系統，減少運行時錯誤。Bun 作為運行時性能優秀。

### Q: 如何進行數據庫遷移？
A: 使用 `bun run migrate` 命令，遷移文件在 `database/migrations/` 中。

### Q: 支持哪些數據庫？
A: 核心支持 SQLite、PostgreSQL、MySQL。通過 Profile 系統配置。

### Q: 如何部署到生產環境？
A: 執行 `bun run build` 生成優化的產物，使用 `bun run start` 運行。

---

## 五、推薦資源

- **官方文檔**：[gravito-framework.com](https://gravito-framework.com)
- **示例應用**：[examples/](../../../examples/)
- **API 文檔**：查看 `@gravito/core` 包的 TypeDoc

---

**祝您開發愉快！🚀**
