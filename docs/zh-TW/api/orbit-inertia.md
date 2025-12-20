---
title: Orbit Inertia
---

# Orbit Inertia

> 在後端 MVC 與前端 React/Vue 元件之間實現無縫整合。

## 安裝

```bash
bun add @gravito/orbit-inertia @inertiajs/react
```

## 設定

Orbit Inertia 是一個 "基礎設施 Orbit"，如果在 `gravito.config.ts` 中偵測到就會自動掛載。

```typescript
// gravito.config.ts
import { OrbitInertia } from '@gravito/orbit-inertia';

export default defineConfig({
    orbits: [OrbitInertia],
    config: {
        inertia: {
            rootView: 'app.html',
            version: '1.0'
        }
    }
});
```

## 基本用法

### Controller

透過 `Context` 注入 `InertiaService`。

```typescript
// src/controllers/HomeController.ts
import { InertiaService } from '@gravito/orbit-inertia';

export class HomeController {
    index(c: Context) {
        const inertia = c.get('inertia') as InertiaService;

        return inertia.render('Home', {
            user: { name: 'Carl' },
            latest_posts: []
        });
    }
}
```

### 前端 (React)

```tsx
// src/client/pages/Home.tsx
interface Props {
    user: { name: string };
    latest_posts: any[];
}

export default function Home({ user, latest_posts }: Props) {
    return (
        <div>
            <h1>歡迎回來, {user.name}!</h1>
        </div>
    );
}
```

## 進階功能

### 共享資料 (Shared Data)

跨請求共享資料 (例如當前使用者、Flash 訊息)。

```typescript
// src/middleware/HandleInertiaRequests.ts
import { InertiaService } from '@gravito/orbit-inertia';

export const handleInertiaRequests = async (c: Context, next: Next) => {
    const inertia = c.get('inertia') as InertiaService;

    inertia.share({
        auth: {
            user: c.get('user')
        },
        flash: c.get('flash')
    });

    await next();
};
```

### Head 管理

你可以用兩種方式管理 `<head>` 標籤：

1.  **後端 (SEO 預設推薦)**:
    ```typescript
    ctx.meta({ title: 'My App', description: '...' });
    ```

2.  **前端 (動態更新)**:
    ```tsx
    import { Head } from '@inertiajs/react';

    <Head title="頁面標題" />
    ```

> **警告**: 請避免使用 `<Head><title>...</title></Head>` 這種子元素寫法，這可能會導致 Inertia 內部序列化錯誤。請使用 `title` prop。

### Layouts

雖然 Inertia 支援 Persistent Layouts (`Page.layout = page => ...`)，但為了更好的型別安全與 HMR 穩定性，我們推薦使用 **Component Wrapping** 方式。

```tsx
// src/client/pages/Home.tsx
export default function Home() {
    return (
        <Layout>
            <Head title="首頁" />
            <div>內容...</div>
        </Layout>
    );
}
```

## API 參考

### `InertiaService`

| 方法 | 描述 |
|------|------|
| `render(component, props?)` | 回傳 Inertia 頁面回應 |
| `share(key, value)` | 與當前請求共享 prop |
| `location(url)` | 伺服器端重定向 (外部連結) |

### Middleware

Gravito 自動註冊 Inertia middleware，它處理了：
- 版本衝突檢測 (`X-Inertia-Version`)
- 部分重載 (`only` 參數)
- JSON vs HTML 回應協商
