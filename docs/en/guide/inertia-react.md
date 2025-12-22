# 🛰️ Inertia (Inertia-React)

Gravito leverages **Inertia.js** to bridge the gap between your powerful Gravito Core backend and modern React frontend. It allows you to build single-page apps (SPAs) without the complexity of client-side routing or building a Rest/GraphQL API.

> 💡 **Using Vue?** Check out the [Inertia-Vue Guide](/docs/guide/inertia-vue) for complete Vue 3 examples.

## 💡 The "No-API" Data Flow

In a traditional SPA, you'd build an API and fetch data with `useEffect`. With Gravito + Inertia, after you `bun add @gravito/ion @gravito/prism`, your Controller **is** your Data Fetcher.

### 1. The Controller (The Provider)
Your controller fetches the data and sends it directly to the view.

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  // Use destructuring for cleaner code
  index({ inertia }: Context) {
    // Data passed here automatically becomes React Props
    return inertia.render('Docs', {
      title: 'Welcome to Gravito',
      content: 'This is the body content.'
    })
  }
}
```

### 2. The React Component (The Consumer)
Your component simply receives the data as standard props. No `fetch`, no `axios`.

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

## 🌍 Shared Data

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

Now, every React component can access `appName` in its props!

---

## 🚦 SPA Navigation

To maintain the Single Page Application experience, you should never use standard `<a>` tags. Use the `<Link />` component provided by `@inertiajs/react`.

```tsx
import { Link } from '@inertiajs/react'

function Navbar() {
  return (
    <nav>
      {/* This fetches JSON and swaps the component instead of reloading */}
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
    </nav>
  )
}
```

---

## 🎨 Persistent Layouts

One of Inertia's most powerful features. To keep your sidebar from re-rendering (and losing its scroll position) during navigation, wrap your pages in a common Layout.

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
      <h1>About Us</h1>
    </Layout>
  )
}
```

## 🛠️ Performance Features

### Partial Reloading

When you only need to update specific data on a page, you can use partial reloading to save bandwidth and improve performance. Inertia allows you to request only specific props instead of reloading the entire page.

#### Using the `only` Parameter

Use the `only` prop on `<Link>` components to specify which props should be reloaded:

```tsx
import { Link } from '@inertiajs/react'

function UserList({ users, stats }) {
  return (
    <div>
      {/* Only reload users, stats remains unchanged */}
      <Link 
        href="/users" 
        only={['users']}
      >
        Refresh User List
      </Link>
      
      <div>
        <h2>User Statistics</h2>
        <p>Total: {stats.total}</p>
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

```tsx
import { router } from '@inertiajs/react'

function RefreshButton() {
  const handleRefresh = () => {
    // Only reload users data
    router.reload({ only: ['users'] })
  }
  
  return (
    <button onClick={handleRefresh}>
      Refresh User List
    </button>
  )
}
```

---

### Scroll Management

Inertia provides powerful scroll position management that automatically remembers and restores scroll positions for each page, delivering a smoother user experience.

#### Automatic Scroll Restoration

By default, Inertia automatically scrolls to the top when navigating to a new page. You can use `preserveScroll` to maintain the current scroll position:

```tsx
import { Link, router } from '@inertiajs/react'

function Navigation() {
  return (
    <nav>
      {/* Preserve current scroll position */}
      <Link 
        href="/settings" 
        preserveScroll
      >
        Settings
      </Link>
      
      {/* Using router.visit also supports preserveScroll */}
      <button 
        onClick={() => router.visit('/settings', { 
          preserveScroll: true 
        })}
      >
        Go to Settings
      </button>
    </nav>
  )
}
```

#### Custom Scroll Behavior

You can use the `scroll` option to control scroll behavior:

```tsx
import { router } from '@inertiajs/react'

function CustomScroll() {
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
  
  return <button onClick={handleClick}>Go to Section 2</button>
}
```

#### Remembering Scroll Positions Per Page

Inertia automatically remembers scroll positions for each page. When users return to a previously visited page, it automatically restores the previous scroll position:

```tsx
import { usePage } from '@inertiajs/react'

function ArticlePage({ article }) {
  // Inertia automatically remembers this page's scroll position
  // When users return, it will be automatically restored
  return (
    <article>
      <h1>{article.title}</h1>
      <div>{article.content}</div>
    </article>
  )
}
```

---

### Form Handling

Inertia provides the `useForm` hook, making form submissions simple and powerful with built-in validation error handling, loading state management, and progress tracking.

#### Basic Form Submission

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
        <label>Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
        />
        {errors.name && <span>{errors.name}</span>}
      </div>
      
      <div>
        <label>Email</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData('email', e.target.value)}
        />
        {errors.email && <span>{errors.email}</span>}
      </div>
      
      <div>
        <label>Password</label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
        />
        {errors.password && <span>{errors.password}</span>}
      </div>
      
      <button type="submit" disabled={processing}>
        {processing ? 'Submitting...' : 'Create User'}
      </button>
    </form>
  )
}
```

#### Form Validation Error Handling

When the backend returns validation errors, `useForm` automatically stores them in the `errors` object:

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
          Please fix the following errors:
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

#### Advanced Form Features

`useForm` provides many advanced features:

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
      // Reset form after success
      onSuccess: () => {
        reset()
      },
      // Preserve scroll position
      preserveScroll: true,
      // Custom success message
      onFinish: () => {
        console.log('Form submission completed')
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {recentlySuccessful && (
        <div className="success-message">
          Submitted successfully!
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
        {processing ? 'Submitting...' : 'Publish'}
      </button>
    </form>
  )
}
```

#### File Uploads

`useForm` also supports file uploads:

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
      forceFormData: true, // Use FormData for file uploads
      onProgress: (event) => {
        console.log(`Upload progress: ${event.progress}%`)
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
          Upload progress: {progress.percentage}%
        </div>
      )}
      
      <button type="submit" disabled={processing}>
        Upload
      </button>
    </form>
  )
}
```

---

> **Next Step**: Make your SPA visible to the world with the [Luminosity SEO Engine](/docs/guide/seo-engine).
