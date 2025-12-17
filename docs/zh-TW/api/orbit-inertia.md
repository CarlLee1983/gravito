# @gravito/orbit-inertia

> Gravito 的 Inertia.js 整合 - 連接後端 MVC 與前端 SPA 的橋樑。

## 📦 安裝

```bash
bun add @gravito/orbit-inertia
```

## 🎯 什麼是 Inertia.js？

Inertia.js 讓您可以建立完全客戶端渲染的單頁應用程式，而不需要面對現代 SPA 的複雜性。它透過利用現有的伺服器端框架來實現這一點。

**主要優點：**

- 像傳統 MVC 一樣寫 Controller
- 獲得 SPA 使用者體驗 (無頁面重新載入)
- SEO 友善，支援伺服器端渲染
- 前端可使用 React、Vue 或 Svelte

---

## 🚀 快速開始

### 1. 設定 Orbit

```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core'
import { OrbitInertia } from '@gravito/orbit-inertia'

export default defineConfig({
  config: {
    inertia: {
      rootView: 'app',           // HTML 模板名稱
      version: '1.0.0',          // 資源版本 (用於快取清除)
    }
  },
  orbits: [OrbitInertia]
})
```

### 2. 建立 HTML 模板

```html
<!-- src/views/app.html -->
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  {{{ inertiaHead }}}
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <div id="app" data-page="{{ inertiaPage }}"></div>
  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

### 3. 建立 Controller

```typescript
// src/controllers/HomeController.ts
import { Context } from 'hono'
import { inertia } from '@gravito/orbit-inertia'

export class HomeController {
  index(ctx: Context) {
    return inertia(ctx, 'Home', {
      title: '歡迎',
      features: ['快速', '輕量', '清晰']
    })
  }

  about(ctx: Context) {
    return inertia(ctx, 'About', {
      title: '關於我們',
      team: ['Alice', 'Bob', 'Charlie']
    })
  }
}
```

### 4. 設定前端 (React)

```tsx
// src/client/app.tsx
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`]
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  }
})
```

```tsx
// src/client/pages/Home.tsx
import { Head } from '@inertiajs/react'

interface HomeProps {
  title: string
  features: string[]
}

export default function Home({ title, features }: HomeProps) {
  return (
    <>
      <Head title={title} />
      <h1>{title}</h1>
      <ul>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </>
  )
}
```

---

## 🔄 內容協商 (Content Negotiation)

`inertia()` 輔助函式會自動處理內容協商：

| 請求標頭 | 回應類型 |
|---------|---------|
| `X-Inertia: true` | JSON (用於 SPA 導航) |
| 一般請求 | 完整 HTML (用於首次載入/爬蟲) |

這代表：

- **首次訪問**: 使用者獲得伺服器渲染的 HTML (利於 SEO)
- **後續導航**: 僅傳送 JSON 載荷 (快速 SPA 體驗)

---

## 📋 API 參考

### `inertia(ctx, component, props)`

渲染 Inertia 回應。

| 參數 | 類型 | 說明 |
|------|------|------|
| `ctx` | `Context` | Hono 請求上下文 |
| `component` | `string` | 組件名稱 (對應到前端頁面) |
| `props` | `object` | 傳遞給組件的資料 |

### `OrbitInertia` 設定選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|-------|------|
| `rootView` | `string` | `'app'` | HTML 模板名稱 |
| `version` | `string` | `'1.0.0'` | 資源版本 (用於快取清除) |

---

## 🪝 Hooks

| Hook | 觸發時機 | 參數 |
|------|---------|------|
| `inertia:render` | 渲染前 | `{ component, props }` |
| `inertia:response` | 回應建立後 | `{ response }` |

### 範例：新增共享屬性

```typescript
core.hooks.addFilter('inertia:render', async ({ component, props }) => {
  return {
    component,
    props: {
      ...props,
      auth: { user: getCurrentUser() },   // 新增認證資料
      flash: { success: '歡迎！' }         // 新增快閃訊息
    }
  }
})
```

---

## 🔗 連結與導航

### React

```tsx
import { Link } from '@inertiajs/react'

<Link href="/about">關於我們</Link>
<Link href="/users" method="post">建立使用者</Link>
```

### 表單處理

```tsx
import { useForm } from '@inertiajs/react'

function ContactForm() {
  const { data, setData, post, processing } = useForm({
    email: '',
    message: ''
  })

  const submit = (e) => {
    e.preventDefault()
    post('/contact')
  }

  return (
    <form onSubmit={submit}>
      <input
        value={data.email}
        onChange={(e) => setData('email', e.target.value)}
      />
      <textarea
        value={data.message}
        onChange={(e) => setData('message', e.target.value)}
      />
      <button disabled={processing}>送出</button>
    </form>
  )
}
```

---

## 🎨 佈局 (Layouts)

建立持久化佈局，在導航時不會重新渲染：

```tsx
// src/client/components/Layout.tsx
import { Link } from '@inertiajs/react'

export default function Layout({ children }) {
  return (
    <div>
      <nav>
        <Link href="/">首頁</Link>
        <Link href="/about">關於</Link>
      </nav>
      <main>{children}</main>
      <footer>© 2024 Gravito</footer>
    </div>
  )
}
```

```tsx
// src/client/pages/Home.tsx
import Layout from '../components/Layout'

function Home({ title }) {
  return <h1>{title}</h1>
}

Home.layout = (page) => <Layout>{page}</Layout>

export default Home
```

---

*更多詳情，請參閱 [Inertia.js 官方文件](https://inertiajs.com/)。*
