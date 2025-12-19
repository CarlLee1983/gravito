# 🛰️ Inertia (Inertia-React)

Gravito leverages **Inertia.js** to bridge the gap between your powerful Hono backend and modern React frontend. It allows you to build single-page apps (SPAs) without the complexity of client-side routing or building a Rest/GraphQL API.

## 💡 The "No-API" Data Flow

In a traditional SPA, you'd build an API and fetch data with `useEffect`. With Gravito + Inertia, your Controller **is** your Data Fetcher.

### 1. The Controller (The Provider)
Your controller fetches the data and sends it directly to the view.

```typescript
// src/controllers/DocsController.ts
export class DocsController {
  index(c: Context) {
    const inertia = c.get('inertia')
    
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

Sometimes you want data to be available on **every** page (like the current user or site-wide navigation). You can use `inertia.share()` in a middleware or your main entry point.

```typescript
app.use('*', async (c, next) => {
  const inertia = c.get('inertia')
  inertia.share('appName', 'Gravito Framework')
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

- **Partial Reloading**: Inertia can request only specific props to save bandwidth.
- **Scroll Management**: Automatically remembers and restores scroll positions.
- **Form Handling**: Use the `useForm` hook for effortless form submissions with validation support.

> **Next Step**: Make your SPA visible to the world with the [SmartMap SEO Engine](/docs/guide/seo-engine).
