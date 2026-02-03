---
title: 授權 (Authorization)
description: 了解如何使用 Gate 與 Policy 來管理 Gravito 應用程式的使用者權限。
---

# 授權 (Authorization)

除了身份認證（Authentication）外，Gravito 還提供了一套簡單且強大的方式來授權使用者對特定資源的操作。

## Gate (閘門)

Gate 是最簡單的授權方式，通常用於不特定於某個 Model 的權限，或者簡單的邏輯檢查。

### 定義 Gate

您可以在 `boot` 階段或透過 Middleware 定義 Gate：

```typescript
// src/providers/AuthServiceProvider.ts
export class AuthServiceProvider extends ServiceProvider {
  async boot() {
    const gate = this.container.make('gate');

    gate.define('update-post', (user, post) => {
      return user.id === post.userId;
    });

    gate.define('admin-only', (user) => {
      return user.role === 'admin';
    });
  }
}
```

### 檢查 Gate

在控制器或路由中，您可以透過 Context 取得 Gate 並進行檢查：

```typescript
core.app.get('/posts/:id/edit', async (c) => {
  const gate = c.get('gate');
  const post = await Post.find(c.req.param('id'));

  // 檢查是否允許
  if (await gate.allows('update-post', post)) {
    // 執行邏輯...
  }

  // 或是直接強制授權（失敗會拋出 403）
  await gate.authorize('update-post', post);
});
```

## Policy (策略)

當您的授權邏輯變得複雜，或者您想將針對特定 Model 的授權邏輯組織在一起時，應使用 **Policy**。

### 定義 Policy

Policy 是簡單的類別，其方法名稱通常與控制器動作對應（如 `view`, `create`, `update`, `delete`）：

```typescript
// src/policies/PostPolicy.ts
export class PostPolicy {
  update(user, post) {
    return user.id === post.userId;
  }

  delete(user, post) {
    return user.role === 'admin' || user.id === post.userId;
  }
}
```

### 註冊 Policy

在您的設定或 Service Provider 中將 Policy 與 Model 綁定：

```typescript
gate.policy(Post, PostPolicy);
```

### 檢查 Policy

一旦註冊，您可以使用與 Gate 相同的語法，但傳入 Model 實例，Gravito 會自動尋找對應的 Policy：

```typescript
// Gravito 會自動呼叫 PostPolicy.update
await c.get('gate').authorize('update', post);
```

## 中間件授權

您也可以在路由定義中直接使用授權中間件：

```typescript
import { can } from '@gravito/sentinel';

// 只有能更新該文章的使用者才能訪問
routes.get('/posts/:id', can('update-post', 'post'), [PostController, 'show']);
```

---

## 接下來
了解如何實作完整的 [身份認證](./authentication.md) 流程。
