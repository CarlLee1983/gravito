# 🛰️ Inertia (Inertia-React)

Gravito 利用 **Inertia.js** 來連接強大的 Hono 後端與現代化的 React 前端。它讓您能夠建構單頁應用程式 (SPA)，而無需處理客戶端路由或複雜的 Rest/GraphQL API 開發。

## 💡 「無 API」的數據流

在傳統的 SPA 中，您需要建構 API 並使用 `useEffect` 獲取數據。而在 Gravito + Inertia 中，您的控制器 (Controller) **就是** 您的數據獲取器。

### 1. 控制器 (數據提供者)
您的控制器負責獲取數據，並直接將其發送到視圖。

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  index(c: Context) {
    const inertia = c.get('inertia')
    
    // 這裡傳遞的數據會自動變成 React 的 Props
    return inertia.render('Docs', {
      title: '歡迎來到 Gravito',
      content: '這是頁面的主體內容。'
    })
  }
}
```

### 2. React 組件 (數據消費者)
您的組件只需像接收標準 Props 一樣接收數據。不需要 `fetch`，也不需要 `axios`。

```tsx
// src/client/pages/Docs.tsx
export default function Docs({ title, content }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{content}</p>
    </div>
  )
}
```

---

## 🌍 共享數據 (Shared Data)

有時您希望數據在 **每一個** 頁面都能使用（例如：當前用戶資訊或全站語系）。您可以在中間件或主入口點使用 `inertia.share()`。

```typescript
app.use('*', async (c, next) => {
  const inertia = c.get('inertia')
  inertia.share('appName', 'Gravito Framework')
  await next()
})
```

現在，每個 React 組件都可以在其 Props 中存取 `appName` 了！

---

## 🚦 SPA 導航

為了保持單頁應用程式 (SPA) 的流暢體驗，您不應使用標準的 `<a>` 標籤，而應使用 `@inertiajs/react` 提供的 `<Link />` 組件。

```tsx
import { Link } from '@inertiajs/react'

function Navbar() {
  return (
    <nav>
      {/* 這會請求 JSON 並替換組件，而不是重新整理整個頁面 */}
      <Link href="/">首頁</Link>
      <Link href="/about">關於我們</Link>
    </nav>
  )
}
```

---

## 🎨 持久化佈局 (Persistent Layouts)

這是 Inertia 最強大的功能之一。為了在導航時防止側邊欄重新渲染（並丟失捲動位置），請將您的頁面包裹在共享的 Layout 中。

```tsx
// src/client/components/Layout.tsx
export default function Layout({ children }) {
  return (
    <main>
      <Sidebar />
      <div className="content">{children}</div>
    </main>
  )
}

// src/client/pages/About.tsx
import Layout from '../components/Layout'

export default function About() {
  return (
    <Layout>
      <h1>關於我們</h1>
    </Layout>
  )
}
```

## 🛠️ 進階性能特性

- **局部重載 (Partial Reloading)**：Inertia 可以僅請求特定的 Props 以節省頻寬。
- **捲動管理 (Scroll Management)**：自動記住並恢復每個頁面的捲動位置。
- **表單處理**：內建 `useForm` Hook，輕鬆處理表單提交與驗證。

> **下一步**：讓您的 SPA 被世界看見，學習使用 [SmartMap SEO 引擎](/zh/docs/guide/seo-engine)。
