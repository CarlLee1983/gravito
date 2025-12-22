# Inertia (Inertia-Vue)

Gravito 利用 **Inertia.js** 來連接強大的 Gravito Core 後端與現代化的 Vue 前端。它讓您能夠建構單頁應用程式 (SPA)，而無需處理客戶端路由或複雜的 Rest/GraphQL API 開發。

> 💡 **使用 React？** 請查看 [Inertia-React 指南](/zh/docs/guide/inertia-react) 以獲取 React 的完整範例。

## 「無 API」的資料流

在傳統的 SPA 中，您需要建構 API 並使用 `onMounted` 獲取資料。而在 Gravito + Inertia 中，您的控制器 (Controller) **就是** 您的資料獲取器。

### 1. 控制器 (資料提供者)
您的控制器負責獲取資料，並直接將其發送到視圖。

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  // 使用解構語法讓程式碼更簡潔
  index({ inertia }: Context) {
    // 這裡傳遞的資料會自動變成 Vue 的 Props
    return inertia.render('Docs', {
      title: '歡迎來到 Gravito',
      content: '這是頁面的主體內容。'
    })
  }
}
```

### 2. Vue 元件 (資料消費者)
您的元件只需像接收標準 Props 一樣接收資料。不需要 `fetch`，也不需要 `axios`。

```vue
<!-- src/client/pages/Docs.vue -->
<template>
  <div>
    <h1>{{ title }}</h1>
    <p>{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  content: string
}>()
</script>
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

現在，每個 Vue 元件都可以在其 Props 中存取 `appName` 了！

---

## SPA 導航

為了保持單頁應用程式 (SPA) 的流暢體驗，您不應使用標準的 `<a>` 標籤，而應使用 `@inertiajs/vue3` 提供的 `<Link>` 元件。

```vue
<template>
  <nav>
    <!-- 這會請求 JSON 並替換元件，而不是重新整理整個頁面 -->
    <Link href="/">首頁</Link>
    <Link href="/about">關於我們</Link>
  </nav>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
</script>
```

---

## 持久化佈局 (Persistent Layouts)

這是 Inertia 最強大的功能之一。為了在導航時防止側邊欄重新渲染（並丟失捲動位置），請將您的頁面包裹在共享的 Layout 中。

```vue
<!-- src/client/components/Layout.vue -->
<template>
  <main>
    <Sidebar />
    <div class="content">
      <slot />
    </div>
  </main>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
</script>
```

```vue
<!-- src/client/pages/About.vue -->
<template>
  <Layout>
    <h1>關於我們</h1>
  </Layout>
</template>

<script setup lang="ts">
import Layout from '../components/Layout.vue'
</script>
```

## 進階效能特性

### 局部重載 (Partial Reloading)

當您只需要更新頁面中的部分資料時，可以使用局部重載來節省頻寬並提升效能。Inertia 允許您僅請求特定的 Props，而不是重新載入整個頁面。

#### 使用 `only` 參數

在 `<Link>` 元件中使用 `only` 屬性來指定需要重新載入的 Props：

```vue
<template>
  <div>
    <!-- 僅重新載入 users，stats 保持不變 -->
    <Link 
      href="/users" 
      :only="['users']"
    >
      重新整理使用者列表
    </Link>
    
    <div>
      <h2>使用者統計</h2>
      <p>總數：{{ stats.total }}</p>
    </div>
    
    <ul>
      <li v-for="user in users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'

defineProps<{
  users: Array<{ id: number; name: string }>
  stats: { total: number }
}>()
</script>
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

```vue
<template>
  <button @click="handleRefresh">
    重新整理使用者列表
  </button>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'

const handleRefresh = () => {
  // 僅重新載入 users 資料
  router.reload({ only: ['users'] })
}
</script>
```

---

### 捲動管理 (Scroll Management)

Inertia 提供了強大的捲動位置管理功能，可以自動記住並恢復每個頁面的捲動位置，提供更流暢的使用者體驗。

#### 自動捲動恢復

預設情況下，Inertia 會在導航到新頁面時自動將頁面捲動到頂部。您可以使用 `preserve-scroll` 來保持當前的捲動位置：

```vue
<template>
  <nav>
    <!-- 保持當前捲動位置 -->
    <Link 
      href="/settings" 
      preserve-scroll
    >
      設定
    </Link>
    
    <!-- 使用 router.visit 也可以保持捲動位置 -->
    <button @click="goToSettings">
      前往設定
    </button>
  </nav>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'

const goToSettings = () => {
  router.visit('/settings', { 
    preserveScroll: true 
  })
}
</script>
```

#### 自訂捲動行為

您可以使用 `scroll` 選項來控制捲動行為：

```vue
<template>
  <button @click="handleClick">前往區塊 2</button>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'

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
</script>
```

#### 記住每個頁面的捲動位置

Inertia 會自動記住每個頁面的捲動位置。當使用者返回之前訪問過的頁面時，會自動恢復到之前的捲動位置：

```vue
<template>
  <article>
    <h1>{{ article.title }}</h1>
    <div>{{ article.content }}</div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  article: {
    title: string
    content: string
  }
}>()
</script>
```

---

### 表單處理

Inertia 提供了 `useForm` Composable，讓表單提交變得簡單且強大，內建驗證錯誤處理、載入狀態管理和進度追蹤。

#### 基本表單提交

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label>姓名</label>
      <input
        type="text"
        v-model="form.name"
      />
      <span v-if="form.errors.name">{{ form.errors.name }}</span>
    </div>
    
    <div>
      <label>電子郵件</label>
      <input
        type="email"
        v-model="form.email"
      />
      <span v-if="form.errors.email">{{ form.errors.email }}</span>
    </div>
    
    <div>
      <label>密碼</label>
      <input
        type="password"
        v-model="form.password"
      />
      <span v-if="form.errors.password">{{ form.errors.password }}</span>
    </div>
    
    <button type="submit" :disabled="form.processing">
      {{ form.processing ? '提交中...' : '建立使用者' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

const form = useForm({
  name: '',
  email: '',
  password: ''
})

const handleSubmit = () => {
  form.post('/users')
}
</script>
```

#### 表單驗證錯誤處理

當後端返回驗證錯誤時，`useForm` 會自動將錯誤儲存在 `errors` 物件中：

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-if="form.hasErrors" class="error-summary">
      請修正以下錯誤：
    </div>
    
    <input
      v-model="form.name"
      :class="{ error: form.errors.name }"
    />
    <span v-if="form.errors.name" class="error">
      {{ form.errors.name }}
    </span>
    
    <input
      v-model="form.email"
      :class="{ error: form.errors.email }"
    />
    <span v-if="form.errors.email" class="error">
      {{ form.errors.email }}
    </span>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

const props = defineProps<{
  user: {
    id: number
    name: string
    email: string
  }
}>()

const form = useForm({
  name: props.user.name,
  email: props.user.email
})

const handleSubmit = () => {
  form.put(`/users/${props.user.id}`)
}
</script>
```

#### 進階表單功能

`useForm` 提供了許多進階功能：

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-if="form.recentlySuccessful" class="success-message">
      提交成功！
    </div>
    
    <input
      v-model="form.title"
      @focus="form.clearErrors('title')"
    />
    <span v-if="form.errors.title">{{ form.errors.title }}</span>
    
    <textarea v-model="form.content"></textarea>
    <span v-if="form.errors.content">{{ form.errors.content }}</span>
    
    <button type="submit" :disabled="form.processing">
      {{ form.processing ? '提交中...' : '發布' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

const form = useForm({
  title: '',
  content: '',
  tags: [] as string[]
})

const handleSubmit = () => {
  form.post('/posts', {
    // 成功後重置表單
    onSuccess: () => {
      form.reset()
    },
    // 保持捲動位置
    preserveScroll: true,
    // 自訂成功訊息
    onFinish: () => {
      console.log('表單提交完成')
    }
  })
}
</script>
```

#### 檔案上傳

`useForm` 也支援檔案上傳：

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input
      type="text"
      v-model="form.title"
    />
    
    <input
      type="file"
      @change="handleFileChange"
    />
    
    <div v-if="form.progress">
      上傳進度: {{ form.progress.percentage }}%
    </div>
    
    <button type="submit" :disabled="form.processing">
      上傳
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'

const form = useForm({
  title: '',
  file: null as File | null
})

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  form.file = target.files?.[0] || null
}

const handleSubmit = () => {
  form.post('/upload', {
    forceFormData: true, // 使用 FormData 進行檔案上傳
    onProgress: (event) => {
      console.log(`上傳進度: ${event.progress}%`)
    }
  })
}
</script>
```

---

> **下一步**：讓您的 SPA 被世界看見，學習使用 [SmartMap SEO 引擎](/zh/docs/guide/seo-engine)。

