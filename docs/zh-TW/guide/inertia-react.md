# Inertia (Inertia-React)

Gravito 利用 **Inertia.js** 來連接強大的 Gravito Core 後端與現代化的 React 前端。它讓您能夠建構單頁應用程式 (SPA)，而無需處理客戶端路由或複雜的 Rest/GraphQL API 開發。

>  **使用 Vue？** 請查看 [Inertia-Vue 指南](/zh/docs/guide/inertia-vue) 以獲取 Vue 3 的完整範例。

## 「無 API」的資料流

在傳統的 SPA 中，您需要建構 API 並使用 `useEffect` 獲取資料。而在 Gravito + Inertia 中，您的控制器 (Controller) **就是** 您的資料獲取器。

### 1. 控制器 (資料提供者)
您的控制器負責獲取資料，並直接將其發送到視圖。

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  // 使用解構語法讓程式碼更簡潔
  index({ inertia }: Context) {
    // 這裡傳遞的資料會自動變成 React 的 Props
    return inertia.render('Docs', {
      title: '歡迎來到 Gravito',
      content: '這是頁面的主體內容。'
    })
  }
}
```

### 2. React 元件 (資料消費者)
您的元件只需像接收標準 Props 一樣接收資料。不需要 `fetch`，也不需要 `axios`。

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

## 共享資料 (Shared Data)

有時您希望資料在 **每一個** 頁面都能使用（例如：當前使用者資訊或全站語系）。您可以在中間件中使用 `inertia.share()`。Gravito 支援 **延遲屬性 (Lazy Props)**，即使用匿名函式，資料只會在渲染時才被執行。

```typescript
app.use('*', async ({ inertia, auth }, next) => {
  // 共享字串
  inertia.share('appName', 'Gravito Framework')
  
  // 延遲共享屬性 (僅在渲染時執行)
  inertia.share('user', () => auth?.user())
  
  await next()
})
```

現在，每個 React 元件都可以在其 Props 中存取 `appName` 了！

---

## SPA 導航

為了保持單頁應用程式 (SPA) 的流暢體驗，您不應使用標準的 `<a>` 標籤，而應使用 `@inertiajs/react` 提供的 `<Link />` 元件。

```tsx
import { Link } from '@inertiajs/react'

function Navbar() {
  return (
    <nav>
      {/* 這會請求 JSON 並替換元件，而不是重新整理整個頁面 */}
      <Link href="/">首頁</Link>
      <Link href="/about">關於我們</Link>
    </nav>
  )
}
```

---

## 持久化佈局 (Persistent Layouts)

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

## 進階效能特性

### 局部重載 (Partial Reloading)

當您只需要更新頁面中的部分資料時，可以使用局部重載來節省頻寬並提升效能。Inertia 允許您僅請求特定的 Props，而不是重新載入整個頁面。

#### 使用 `only` 參數

在 `<Link>` 元件中使用 `only` 屬性來指定需要重新載入的 Props：

```tsx
import { Link } from '@inertiajs/react'

function UserList({ users, stats }) {
  return (
    <div>
      {/* 僅重新載入 users，stats 保持不變 */}
      <Link 
        href="/users" 
        only={['users']}
      >
        重新整理使用者列表
      </Link>
      
      <div>
        <h2>使用者統計</h2>
        <p>總數：{stats.total}</p>
      </div>
      
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

#### 在控制器中處理局部重載

您的控制器可以檢查 `only` 參數，只返回請求的資料：

```typescript
// src/controllers/UserController.ts
export class UserController {
  index({ inertia, inertia: { only } }: Context) {
    const users = await db.select().from(usersTable)
    
    // 如果只請求 users，就不需要查詢 stats
    if (only && only.includes('users')) {
      return inertia.render('Users', { users })
    }
    
    // 否則返回完整資料
    const stats = await db.select().from(statsTable)
    return inertia.render('Users', { users, stats })
  }
}
```

#### 使用 `router.reload()` 進行局部重載

您也可以使用 `router.reload()` 方法來重新載入當前頁面的特定 Props：

```tsx
import { router } from '@inertiajs/react'

function RefreshButton() {
  const handleRefresh = () => {
    // 僅重新載入 users 資料
    router.reload({ only: ['users'] })
  }
  
  return (
    <button onClick={handleRefresh}>
      重新整理使用者列表
    </button>
  )
}
```

---

### 捲動管理 (Scroll Management)

Inertia 提供了強大的捲動位置管理功能，可以自動記住並恢復每個頁面的捲動位置，提供更流暢的使用者體驗。

#### 自動捲動恢復

預設情況下，Inertia 會在導航到新頁面時自動將頁面捲動到頂部。您可以使用 `preserveScroll` 來保持當前的捲動位置：

```tsx
import { Link, router } from '@inertiajs/react'

function Navigation() {
  return (
    <nav>
      {/* 保持當前捲動位置 */}
      <Link 
        href="/settings" 
        preserveScroll
      >
        設定
      </Link>
      
      {/* 使用 router.visit 也可以保持捲動位置 */}
      <button 
        onClick={() => router.visit('/settings', { 
          preserveScroll: true 
        })}
      >
        前往設定
      </button>
    </nav>
  )
}
```

#### 自訂捲動行為

您可以使用 `scroll` 選項來控制捲動行為：

```tsx
import { router } from '@inertiajs/react'

function CustomScroll() {
  const handleClick = () => {
    router.visit('/page', {
      // 捲動到特定元素
      scroll: (page) => {
        const element = page.querySelector('#section-2')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }
    })
  }
  
  return <button onClick={handleClick}>前往區塊 2</button>
}
```

#### 記住每個頁面的捲動位置

Inertia 會自動記住每個頁面的捲動位置。當使用者返回之前訪問過的頁面時，會自動恢復到之前的捲動位置：

```tsx
import { usePage } from '@inertiajs/react'

function ArticlePage({ article }) {
  // Inertia 會自動記住這個頁面的捲動位置
  // 當使用者返回時，會自動恢復
  return (
    <article>
      <h1>{article.title}</h1>
      <div>{article.content}</div>
    </article>
  )
}
```

---

### 表單處理

Inertia 提供了 `useForm` Hook，讓表單提交變得簡單且強大，內建驗證錯誤處理、載入狀態管理和進度追蹤。

#### 基本表單提交

```tsx
import { useForm } from '@inertiajs/react'

function CreateUserForm() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: ''
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    post('/users')
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>姓名</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
        />
        {errors.name && <span>{errors.name}</span>}
      </div>
      
      <div>
        <label>電子郵件</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData('email', e.target.value)}
        />
        {errors.email && <span>{errors.email}</span>}
      </div>
      
      <div>
        <label>密碼</label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
        />
        {errors.password && <span>{errors.password}</span>}
      </div>
      
      <button type="submit" disabled={processing}>
        {processing ? '提交中...' : '建立使用者'}
      </button>
    </form>
  )
}
```

#### 表單驗證錯誤處理

當後端返回驗證錯誤時，`useForm` 會自動將錯誤儲存在 `errors` 物件中：

```tsx
import { useForm } from '@inertiajs/react'

function UpdateProfileForm({ user }) {
  const { data, setData, put, errors, hasErrors } = useForm({
    name: user.name,
    email: user.email
  })
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      put(`/users/${user.id}`)
    }}>
      {hasErrors && (
        <div className="error-summary">
          請修正以下錯誤：
        </div>
      )}
      
      <input
        value={data.name}
        onChange={(e) => setData('name', e.target.value)}
        className={errors.name ? 'error' : ''}
      />
      {errors.name && <span className="error">{errors.name}</span>}
      
      <input
        value={data.email}
        onChange={(e) => setData('email', e.target.value)}
        className={errors.email ? 'error' : ''}
      />
      {errors.email && <span className="error">{errors.email}</span>}
    </form>
  )
}
```

#### 進階表單功能

`useForm` 提供了許多進階功能：

```tsx
import { useForm } from '@inertiajs/react'

function AdvancedForm() {
  const { 
    data, 
    setData, 
    post, 
    processing, 
    errors,
    reset,
    clearErrors,
    recentlySuccessful
  } = useForm({
    title: '',
    content: '',
    tags: []
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    post('/posts', {
      // 成功後重置表單
      onSuccess: () => {
        reset()
      },
      // 保持捲動位置
      preserveScroll: true,
      // 自訂成功訊息
      onFinish: () => {
        console.log('表單提交完成')
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {recentlySuccessful && (
        <div className="success-message">
          提交成功！
        </div>
      )}
      
      <input
        value={data.title}
        onChange={(e) => setData('title', e.target.value)}
        onFocus={() => clearErrors('title')}
      />
      {errors.title && <span>{errors.title}</span>}
      
      <textarea
        value={data.content}
        onChange={(e) => setData('content', e.target.value)}
      />
      {errors.content && <span>{errors.content}</span>}
      
      <button type="submit" disabled={processing}>
        {processing ? '提交中...' : '發佈'}
      </button>
    </form>
  )
}
```

#### 檔案上傳

`useForm` 也支援檔案上傳：

```tsx
import { useForm } from '@inertiajs/react'

function UploadForm() {
  const { data, setData, post, processing, progress } = useForm({
    title: '',
    file: null as File | null
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    post('/upload', {
      forceFormData: true, // 使用 FormData 進行檔案上傳
      onProgress: (event) => {
        console.log(`上傳進度: ${event.progress}%`)
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={data.title}
        onChange={(e) => setData('title', e.target.value)}
      />
      
      <input
        type="file"
        onChange={(e) => setData('file', e.target.files?.[0] || null)}
      />
      
      {progress && (
        <div>
          上傳進度: {progress.percentage}%
        </div>
      )}
      
      <button type="submit" disabled={processing}>
        上傳
      </button>
    </form>
  )
}
```

---

> **下一步**：讓您的 SPA 被世界看見，學習使用 [Luminosity SEO 引擎](/zh/docs/guide/seo-engine)。
