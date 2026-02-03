# Inertia (Inertia-Vue)

Gravito leverages **Inertia.js** to bridge the gap between your powerful Gravito Core backend and modern Vue frontend. It allows you to build single-page apps (SPAs) without the complexity of client-side routing or building a Rest/GraphQL API.

>  **Using React?** Check out the [Inertia-React Guide](/docs/guide/inertia-react) for complete React examples.

## The "No-API" Data Flow

In a traditional SPA, you'd build an API and fetch data with `onMounted`. With Gravito + Inertia, after you `bun add @gravito/ion @gravito/prism`, your Controller **is** your Data Fetcher.

### 1. The Controller (The Provider)
Your controller fetches the data and sends it directly to the view.

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  // Use destructuring for cleaner code
  index({ inertia }: Context) {
    // Data passed here automatically becomes Vue Props
    return inertia.render('Docs', {
      title: 'Welcome to Gravito',
      content: 'This is the body content.'
    })
  }
}
```

### 2. The Vue Component (The Consumer)
Your component simply receives the data as standard props. No `fetch`, no `axios`.

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

## Shared Data

Sometimes you want data to be available on **every** page (like the current user or site-wide navigation). You can use `inertia.share()` in a middleware. Gravito supports **Lazy Props** (closures), so data is only evaluated when rendering.

```typescript
app.use('*', async ({ inertia, auth }, next) => {
  // Shared string
  inertia.share('appName', 'Gravito Framework')
  
  // Lazy shared property (evaluated during render)
  inertia.share('user', () => auth?.user())
  
  await next()
})
```

Now, every Vue component can access `appName` in its props!

---

## SPA Navigation

To maintain the Single Page Application experience, you should never use standard `<a>` tags. Use the `<Link>` component provided by `@inertiajs/vue3`.

```vue
<template>
  <nav>
    <!-- This fetches JSON and swaps the component instead of reloading -->
    <Link href="/">Home</Link>
    <Link href="/about">About</Link>
  </nav>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
</script>
```

---

## Persistent Layouts

One of Inertia's most powerful features. To keep your sidebar from re-rendering (and losing its scroll position) during navigation, wrap your pages in a common Layout.

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
    <h1>About Us</h1>
  </Layout>
</template>

<script setup lang="ts">
import Layout from '../components/Layout.vue'
</script>
```

## Performance Features

### Partial Reloading

When you only need to update specific data on a page, you can use partial reloading to save bandwidth and improve performance. Inertia allows you to request only specific props instead of reloading the entire page.

#### Using the `only` Parameter

Use the `only` prop on `<Link>` components to specify which props should be reloaded:

```vue
<template>
  <div>
    <!-- Only reload users, stats remains unchanged -->
    <Link 
      href="/users" 
      :only="['users']"
    >
      Refresh User List
    </Link>
    
    <div>
      <h2>User Statistics</h2>
      <p>Total: {{ stats.total }}</p>
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

#### Handling Partial Reloads in Controllers

Your controller can check the `only` parameter and return only the requested data:

```typescript
// src/controllers/UserController.ts
export class UserController {
  index({ inertia, inertia: { only } }: Context) {
    const users = await db.select().from(usersTable)
    
    // If only users is requested, skip stats query
    if (only && only.includes('users')) {
      return inertia.render('Users', { users })
    }
    
    // Otherwise return full data
    const stats = await db.select().from(statsTable)
    return inertia.render('Users', { users, stats })
  }
}
```

#### Using `router.reload()` for Partial Reloads

You can also use the `router.reload()` method to reload specific props of the current page:

```vue
<template>
  <button @click="handleRefresh">
    Refresh User List
  </button>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'

const handleRefresh = () => {
  // Only reload users data
  router.reload({ only: ['users'] })
}
</script>
```

---

### Scroll Management

Inertia provides powerful scroll position management that automatically remembers and restores scroll positions for each page, delivering a smoother user experience.

#### Automatic Scroll Restoration

By default, Inertia automatically scrolls to the top when navigating to a new page. You can use `preserve-scroll` to maintain the current scroll position:

```vue
<template>
  <nav>
    <!-- Preserve current scroll position -->
    <Link 
      href="/settings" 
      preserve-scroll
    >
      Settings
    </Link>
    
    <!-- Using router.visit also supports preserveScroll -->
    <button @click="goToSettings">
      Go to Settings
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

#### Custom Scroll Behavior

You can use the `scroll` option to control scroll behavior:

```vue
<template>
  <button @click="handleClick">Go to Section 2</button>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'

const handleClick = () => {
  router.visit('/page', {
    // Scroll to specific element
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

#### Remembering Scroll Positions Per Page

Inertia automatically remembers scroll positions for each page. When users return to a previously visited page, it automatically restores the previous scroll position:

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

### Form Handling

Inertia provides the `useForm` composable, making form submissions simple and powerful with built-in validation error handling, loading state management, and progress tracking.

#### Basic Form Submission

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label>Name</label>
      <input
        type="text"
        v-model="form.name"
      />
      <span v-if="form.errors.name">{{ form.errors.name }}</span>
    </div>
    
    <div>
      <label>Email</label>
      <input
        type="email"
        v-model="form.email"
      />
      <span v-if="form.errors.email">{{ form.errors.email }}</span>
    </div>
    
    <div>
      <label>Password</label>
      <input
        type="password"
        v-model="form.password"
      />
      <span v-if="form.errors.password">{{ form.errors.password }}</span>
    </div>
    
    <button type="submit" :disabled="form.processing">
      {{ form.processing ? 'Submitting...' : 'Create User' }}
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

#### Form Validation Error Handling

When the backend returns validation errors, `useForm` automatically stores them in the `errors` object:

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-if="form.hasErrors" class="error-summary">
      Please fix the following errors:
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

#### Advanced Form Features

`useForm` provides many advanced features:

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-if="form.recentlySuccessful" class="success-message">
      Submitted successfully!
    </div>
    
    <input
      v-model="form.title"
      @focus="form.clearErrors('title')"
    />
    <span v-if="form.errors.title">{{ form.errors.title }}</span>
    
    <textarea v-model="form.content"></textarea>
    <span v-if="form.errors.content">{{ form.errors.content }}</span>
    
    <button type="submit" :disabled="form.processing">
      {{ form.processing ? 'Submitting...' : 'Publish' }}
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
    // Reset form after success
    onSuccess: () => {
      form.reset()
    },
    // Preserve scroll position
    preserveScroll: true,
    // Custom success message
    onFinish: () => {
      console.log('Form submission completed')
    }
  })
}
</script>
```

#### File Uploads

`useForm` also supports file uploads:

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
      Upload progress: {{ form.progress.percentage }}%
    </div>
    
    <button type="submit" :disabled="form.processing">
      Upload
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

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
    forceFormData: true, // Use FormData for file uploads
    onProgress: (event) => {
      console.log(`Upload progress: ${event.progress}%`)
    }
  })
}
</script>
```

---

> **Next Step**: Make your SPA visible to the world with the [SmartMap SEO Engine](/docs/guide/seo-engine).

